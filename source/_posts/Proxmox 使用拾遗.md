
---

title: Proxmox 使用拾遗

urlname: ngycql

date: 2019-09-03 00:00:00 +0800

layout: post

comments: true

categories: Proxmox

tags: [Linux,Proxmox]

keywords: Proxmox

description: 本文记录使用 Proxmox 过程中用到的操作。

---


<a name="BdT88"></a>
#### zfs destroy 提示 dataset is busy
报错如下：

```bash
root@umstor22:~# zfs destroy -r umstor22-zfs
cannot destroy 'umstor22-zfs/vm-109-disk-0': dataset is busy
cannot destroy 'umstor22-zfs/vm-109-disk-2': dataset is busy
cannot destroy 'umstor22-zfs/vm-109-disk-1': dataset is busy
```

首先使用 fuser 查看挂载了相关虚拟设备的进程：

```bash
root@umstor22:~# fuser -am /dev/umstor22-zfs/vm-109-disk-0
/dev/zd0:            2133532
root@umstor22:~# fuser -am /dev/umstor22-zfs/vm-109-disk-1
/dev/zd16:           2133532
root@umstor22:~# fuser -am /dev/umstor22-zfs/vm-109-disk-2
/dev/zd32:           2133532
```

然后查看进程号为 2133532 的进程信息：

```bash
root@umstor22:~# ps aux | grep 2133532
root     1832619  0.0  0.0   6072   892 pts/0    S+   11:41   0:00 grep 2133532
root     2133532  3.2  0.1 9705992 105132 ?      Sl   Sep02  42:19 /usr/bin/kvm -id 109 -name yf01 -chardev socket,id=qmp,path=/var/run/qemu-server/109.qmp,server,nowait -mon chardev=qmp,mode=control -chardev socket,id=qmp-event,path=/var/run/qmeventd.sock,reconnect=5 -mon chardev=qmp-event,mode=control -pidfile /var/run/qemu-server/109.pid -daemonize -smbios type=1,uuid=3969d5bf-1597-4834-ac82-bc89de18495a -smp 8,sockets=2,cores=4,maxcpus=8 -nodefaults -boot menu=on,strict=on,reboot-timeout=1000,splash=/usr/share/qemu-server/bootsplash.jpg -vnc unix:/var/run/qemu-server/109.vnc,password -cpu kvm64,+lahf_lm,+sep,+kvm_pv_unhalt,+kvm_pv_eoi,enforce -m 8192 -device pci-bridge,id=pci.1,chassis_nr=1,bus=pci.0,addr=0x1e -device pci-bridge,id=pci.2,chassis_nr=2,bus=pci.0,addr=0x1f -device vmgenid,guid=b917480a-d4f1-4d4d-869e-632b6a9d7769 -device piix3-usb-uhci,id=uhci,bus=pci.0,addr=0x1.0x2 -device usb-tablet,id=tablet,bus=uhci.0,port=1 -device VGA,id=vga,bus=pci.0,addr=0x2 -chardev socket,path=/var/run/qemu-server/109.qga,server,nowait,id=qga0 -device virtio-serial,id=qga0,bus=pci.0,addr=0x8 -device virtserialport,chardev=qga0,name=org.qemu.guest_agent.0 -device virtio-balloon-pci,id=balloon0,bus=pci.0,addr=0x3 -iscsi initiator-name=iqn.1993-08.org.debian:01:c024a4d1a487 -drive file=rbd:cloud-disk/vm-109-cloudinit:conf=/etc/pve/ceph.conf:id=admin:keyring=/etc/pve/priv/ceph/ceph.keyring,if=none,id=drive-ide0,media=cdrom,aio=threads -device ide-cd,bus=ide.0,unit=0,drive=drive-ide0,id=ide0,bootindex=200 -device virtio-scsi-pci,id=scsihw0,bus=pci.0,addr=0x5 -drive file=/dev/zvol/umstor22-zfs/vm-109-disk-0,if=none,id=drive-scsi0,format=raw,cache=none,aio=native,detect-zeroes=on -device scsi-hd,bus=scsihw0.0,channel=0,scsi-id=0,lun=0,drive=drive-scsi0,id=scsi0,bootindex=100 -drive file=/dev/zvol/umstor22-zfs/vm-109-disk-1,if=none,id=drive-scsi1,format=raw,cache=none,aio=native,detect-zeroes=on -device scsi-hd,bus=scsihw0.0,channel=0,scsi-id=0,lun=1,drive=drive-scsi1,id=scsi1 -drive file=/dev/zvol/umstor22-zfs/vm-109-disk-2,if=none,id=drive-scsi2,format=raw,cache=none,aio=native,detect-zeroes=on -device scsi-hd,bus=scsihw0.0,channel=0,scsi-id=0,lun=2,drive=drive-scsi2,id=scsi2 -drive file=rbd:cloud-disk/vm-109-disk-0:conf=/etc/pve/ceph.conf:id=admin:keyring=/etc/pve/priv/ceph/ceph.keyring,if=none,id=drive-scsi3,format=raw,cache=none,aio=native,detect-zeroes=on -device scsi-hd,bus=scsihw0.0,channel=0,scsi-id=0,lun=3,drive=drive-scsi3,id=scsi3 -drive file=rbd:cloud-disk/vm-109-disk-2:conf=/etc/pve/ceph.conf:id=admin:keyring=/etc/pve/priv/ceph/ceph.keyring,if=none,id=drive-scsi4,format=raw,cache=none,aio=native,detect-zeroes=on -device scsi-hd,bus=scsihw0.0,channel=0,scsi-id=0,lun=4,drive=drive-scsi4,id=scsi4 -drive file=rbd:cloud-disk/vm-109-disk-5:conf=/etc/pve/ceph.conf:id=admin:keyring=/etc/pve/priv/ceph/ceph.keyring,if=none,id=drive-scsi5,format=raw,cache=none,aio=native,detect-zeroes=on -device scsi-hd,bus=scsihw0.0,channel=0,scsi-id=0,lun=5,drive=drive-scsi5,id=scsi5 -netdev type=tap,id=net0,ifname=tap109i0,script=/var/lib/qemu-server/pve-bridge,downscript=/var/lib/qemu-server/pve-bridgedown,vhost=on -device virtio-net-pci,mac=1A:D3:33:5C:92:DF,netdev=net0,bus=pci.0,addr=0x12,id=net0,bootindex=300 -machine type=pc-i440fx-4.0 -incoming unix:/run/qemu-server/109.migrate -S
```

可知，该进程为一个 kvm 虚拟机的进程，杀掉进程后重新执行 destroy 即可：

```bash
kill -9 2133532
zfs destroy -r umstor22-zfs
zpool destroy umstor22-zfs
```

- vm is locked

```bash
qm unlock 101
```


