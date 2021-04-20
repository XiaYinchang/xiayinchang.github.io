---
title: client-go 的零零碎碎的用法
urlname: ftrb7u
date: '2021-01-10 00:00:00 +0000'
layout: post
comments: true
categories: kubernetes
tags:
  - kubernetes
  - client-go
keywords: client-go
description: client-go 使用过程的中一些零碎知识的记录。
abbrlink: '91373500'
updated: 2021-04-20 00:00:00
---

#### 使用 raw url 操作资源对象

```bash
data, err := clientset.RESTClient().Get().AbsPath("apis/metrics.k8s.io/v1beta1/nodes").DoRaw()
```

#### 使用 dynamic client 和 server side apply

参考：[An example of using dynamic client of k8s.io/client-go](https://ymmt2005.hatenablog.com/entry/2020/04/14/An_example_of_using_dynamic_client_of_k8s.io/client-go)

```go
import (
    "context"
    "encoding/json"

    "k8s.io/apimachinery/pkg/api/meta"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
    "k8s.io/apimachinery/pkg/runtime/serializer/yaml"
    "k8s.io/apimachinery/pkg/types"
    "k8s.io/client-go/discovery"
    "k8s.io/client-go/discovery/cached/memory"
    "k8s.io/client-go/dynamic"
    "k8s.io/client-go/rest"
    "k8s.io/client-go/restmapper"
)

const deploymentYAML = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  namespace: default
spec:
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
`

var decUnstructured = yaml.NewDecodingSerializer(unstructured.UnstructuredJSONScheme)

func doSSA(ctx context.Context, cfg *rest.Config) error {

    // 1. Prepare a RESTMapper to find GVR
    dc, err := discovery.NewDiscoveryClientForConfig(cfg)
    if err != nil {
        return err
    }
    mapper := restmapper.NewDeferredDiscoveryRESTMapper(memory.NewMemCacheClient(dc))

    // 2. Prepare the dynamic client
    dyn, err := dynamic.NewForConfig(cfg)
    if err != nil {
        return err
    }

    // 3. Decode YAML manifest into unstructured.Unstructured
    obj := &unstructured.Unstructured{}
    _, gvk, err := decUnstructured.Decode([]byte(deploymentYAML), nil, obj)
    if err != nil {
        return err
    }

    // 4. Find GVR
    mapping, err := mapper.RESTMapping(gvk.GroupKind(), gvk.Version)
    if err != nil {
        return err
    }

    // 5. Obtain REST interface for the GVR
    var dr dynamic.ResourceInterface
    if mapping.Scope.Name() == meta.RESTScopeNameNamespace {
        // namespaced resources should specify the namespace
        dr = dyn.Resource(mapping.Resource).Namespace(obj.GetNamespace())
    } else {
        // for cluster-wide resources
        dr = dyn.Resource(mapping.Resource)
    }

    // 6. Marshal object into JSON
    data, err := json.Marshal(obj)
    if err != nil {
        return err
    }

    // 7. Create or Update the object with SSA
    //     types.ApplyPatchType indicates SSA.
    //     FieldManager specifies the field owner ID.
    _, err = dr.Patch(ctx, obj.GetName(), types.ApplyPatchType, data, metav1.PatchOptions{
        FieldManager: "sample-controller",
    })

    return err
}
```

#### 使用 leader election 选主实现高可用

参考：[Leader Election inside Kubernetes](https://carlosbecker.com/posts/k8s-leader-election)

```go
import (
    v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/leaderelection"
	"k8s.io/client-go/tools/leaderelection/resourcelock"
)

func main() {
	envKubeConfigPath := os.Getenv("KUBECONFIG")
	if envKubeConfigPath == "" {
		klog.Fatal("KUBECONFIG env must be set for kubeconfig file path")
	}
	leaseNamespace := os.Getenv("LEASE_NAMESPACE")
	if leaseNamespace == "" {
		klog.Fatal("LEASE_NAMESPACE must be set for leader election")
	}
	config, err := clientcmd.BuildConfigFromFlags("", envKubeConfigPath)
	if err != nil {
		klog.Fatal(err)
	}
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		klog.Fatal(err)
	}
	inClusterConfig, err := rest.InClusterConfig()
	if err != nil {
		klog.Fatal(err)
	}
	inClusterClient, err := kubernetes.NewForConfig(inClusterConfig)
	if err != nil {
		klog.Fatal(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	sigc := make(chan os.Signal, 1)
	signal.Notify(sigc, syscall.SIGHUP, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)
	go func() {
		<-sigc
		cancel()
	}()

	id := uuid.New().String()
	klog.Infof("ResourceLock identity id: %s", id)
	lock := &resourcelock.LeaseLock{
		LeaseMeta: metav1.ObjectMeta{
			Name:      "k8s-events-exporter",
			Namespace: leaseNamespace,
		},
		Client: inClusterClient.CoordinationV1(),
		LockConfig: resourcelock.ResourceLockConfig{
			Identity: id,
		},
	}

	// Start the leader election code loop
	klog.Infof("LeaderElectionConfig are: LeaseDuration %v second, RenewDeadline %v second, RetryPeriod %v second.",
		leaseDuration, renewDeadline, retryPeriod)
	subCtx, subCancel := context.WithCancel(ctx)
	leaderelection.RunOrDie(ctx, leaderelection.LeaderElectionConfig{
		Lock:            lock,
		ReleaseOnCancel: true,
		LeaseDuration:   leaseDuration * time.Second,
		RenewDeadline:   renewDeadline * time.Second,
		RetryPeriod:     retryPeriod * time.Second,
		Callbacks: leaderelection.LeaderCallbacks{
			OnStartedLeading: func(ctx context.Context) {
				run(subCtx, clientset)
			},
			OnStoppedLeading: func() {
				klog.Warningf("Leader %s lost", id)
				subCancel()
			},
			OnNewLeader: func(identity string) {
				// we're notified when new leader elected
				if identity == id {
					klog.Infof("Acquired the lock %s", identity)
				} else {
					klog.Infof("Leader is %v for the moment", identity)
				}
			},
		},
	})
}
```

#### 批量删除资源

```go
//根据label批量删除pvc
labelPvc := labels.SelectorFromSet(labels.Set(map[string]string{"app": redisClusterName}))
listPvcOptions := metav1.ListOptions{
    LabelSelector: labelPvc.String(),
}
err = kubeClient.CoreV1().PersistentVolumeClaims(redisClusterNamespace).DeleteCollection(&metav1.DeleteOptions{}, listPvcOptions)
if err != nil {
    if !errors.IsNotFound(err) {
        klog.Errorf("Drop RedisCluster: %v/%v pvc error: %v", redisClusterNamespace, redisClusterName, err)
        return err
    }
}
```

#### 使用 fake client 写单元测试

使用 interface ( kubernetes.Interface ) 而不是 struct ( kubernetes.Clientset )。

```go
package namespaces

import (
	"fmt"

	"k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

type KubernetesAPI struct {
	Suffix string
	Client  kubernetes.Interface
}

// NewNamespaceWithPostfix creates a new namespace with a stable postfix
func (k KubernetesAPI) NewNamespaceWithSuffix(namespace string) error {
	ns := &v1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: fmt.Sprintf("%s-%s", namespace, k.Suffix),
		},
	}

	_, err := k.Client.CoreV1().Namespaces().Create(ns)

	if err != nil {
		return err
	}

	return nil
}
```

```go
ackage namespaces

import (
	"testing"

	"k8s.io/apimachinery/pkg/apis/meta/v1"
	testclient "k8s.io/client-go/kubernetes/fake"
)

func TestNewNamespaceWithSuffix(t *testing.T) {
	cases := []struct {
		ns string
	}{
		{
			ns: "test",
		},
	}

	api := &KubernetesAPI{
		Suffix: "unit-test",
		Client:  testclient.NewSimpleClientset(),
	}

	for _, c := range cases {
		// create the postfixed namespace
		err := api.NewNamespaceWithSuffix(c.ns)
		if err != nil {
			t.Fatal(err.Error())
		}

		_, err = api.Client.CoreV1().Namespaces().Get("test-unit-test", v1.GetOptions{})

		if err != nil {
			t.Fatal(err.Error())
		}
	}
}
```
