package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/aliyun/aliyun-oss-go-sdk/oss"
)

const (
	publicDir     = "./public"
	ossHKEndpoint = "https://oss-cn-hongkong.aliyuncs.com"
)

var (
	accessKeyID     = os.Getenv("OSS_ACCESS_KEY")
	accessKeySecret = os.Getenv("OSS_SECRET_KEY")
	bucketName      = "xyc-blog-images"
)

type ImageInfo struct {
	Name   string `json:"name"`
	Origin string `json:"origin"`
	Oss    string `json:"oss"`
}

type ImageList struct {
	Images []ImageInfo `json:"images"`
}

func main() {
	images := ImageList{}
	data, err := os.ReadFile("./imageMap.json")
	if err != nil {
		log.Fatal(err)
	}
	err = json.Unmarshal(data, &images)
	if err != nil {
		log.Fatal(err)
	}
	client, err := oss.New(ossHKEndpoint, accessKeyID, accessKeySecret)
	if err != nil {
		log.Fatal(err)
	}
	bucket, err := client.Bucket(bucketName)
	if err != nil {
		log.Fatal(err)
	}
	re := regexp.MustCompile(`<img.*?(?:>|\/>)`)
	re2 := regexp.MustCompile(`src=[\'\"]?([^\'\"]*)[\'\"]?`)
	err = filepath.Walk(publicDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		if filepath.Ext(path) != ".html" {
			return nil
		}
		content, err := os.ReadFile(path)
		if err != nil {
			return nil
		}
		contentStr := string(content)
		matches := re.FindAll(content, -1)
		for _, match := range matches {
			subMatch := re2.FindSubmatch(match)
			if len(subMatch) < 2 {
				continue
			}
			imageAddrBytes := re2.FindSubmatch(match)[1]
			imageAddr := string(imageAddrBytes)
			if !strings.HasPrefix(imageAddr, "https://cdn.nlark.com/yuque") {
				continue
			}
			imageName := getImageName(imageAddr)
			ossImageAddr := getOssImage(images.Images, imageName)
			if len(ossImageAddr) == 0 {
				ossImageAddr = uploadToOss(bucket, imageAddr)
				images.Images = append(images.Images, ImageInfo{
					Name:   imageName,
					Origin: imageAddr,
					Oss:    ossImageAddr,
				})
			}
			if len(ossImageAddr) > 0 {
				contentStr = strings.ReplaceAll(contentStr, imageAddr, ossImageAddr)
			}
		}
		return os.WriteFile(path, []byte(contentStr), 0644)
	})
	if err != nil {
		log.Fatal(err)
	}
	finalData, err := json.Marshal(images)
	if err != nil {
		log.Fatal(err)
	}
	err = os.WriteFile("./imageMap.json", finalData, 0644)
	if err != nil {
		log.Fatal(err)
	}
}

func getOssImage(images []ImageInfo, imageName string) string {
	for _, image := range images {
		if image.Name == imageName {
			return image.Oss
		}
	}
	return ""
}

func getImageName(imgAddr string) string {
	tmpStr := strings.Split(imgAddr, "#")[0]
	tmpStrList := strings.Split(tmpStr, "/")
	return tmpStrList[len(tmpStrList)-1]
}

func uploadToOss(ossBucketClient *oss.Bucket, imgAddr string) string {
	response, err := http.Get(imgAddr)
	if err != nil {
		log.Println(err)
		return ""
	}
	defer response.Body.Close()
	objectKey := getImageName(imgAddr)
	err = ossBucketClient.PutObject(objectKey, response.Body)
	if err != nil {
		log.Println(err)
		return ""
	}
	err = ossBucketClient.SetObjectACL(objectKey, oss.ACLPublicRead)
	if err != nil {
		log.Println(err)
		return ""
	}
	return `https://xyc-blog-images.oss-cn-hongkong.aliyuncs.com/` + objectKey
}
