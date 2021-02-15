const fs = require("fs");
const path = require("path");
const https = require("https");
const FormData = require("form-data");
const request = require("request");
const OSS = require("ali-oss");
const PassThrough = require("stream").PassThrough;
const StormDB = require("stormdb");
const engine = new StormDB.localFileEngine("./imageMap.json");
const db = new StormDB(engine);
const publicDir = "./public";
// Loop through all the files in the temp directory
function readDir(dir) {
  fs.readdir(dir, function (err, files) {
    if (err) {
      console.error("Could not list the directory.", err);
      process.exit(1);
    }

    files.forEach(function (file, index) {
      // Make one pass and make the file complete
      const relativePath = path.join(dir, file);

      fs.stat(relativePath, function (error, stat) {
        if (error) {
          console.error("Error stating file.", error);
          return;
        }

        if (stat.isFile()) {
          replaceImgAddr(relativePath);
        } else if (stat.isDirectory()) {
          readDir(relativePath);
        }
      });
    });
  });
}

function sleep(millis) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}

function replaceImgAddr(filename) {
  if (path.extname(filename) === ".html") {
    fs.readFile(filename, "utf8", async (err, data) => {
      if (err) throw err;
      let dataStr = String(data);
      const regexp = /<img.*?(?:>|\/>)/gi;
      const srcReg = /src=[\'\"]?([^\'\"]*)[\'\"]?/i;
      const matches = dataStr.matchAll(regexp);
      for (const match of matches) {
        const imgAddr = match[0].match(srcReg)[1];
        if (imgAddr.startsWith("https://cdn.nlark.com/yuque")) {
          let imagePath = "";
          let imageName = getImageName(imgAddr);
          let imageMap = db
            .get("images")
            .filter((ele) => ele.name === imageName)
            .get(0)
            .value();
          if (imageMap) {
            imagePath = imageMap.oss;
          } else {
            try {
              imagePath = await uploadToOSS(imgAddr);
              if (imagePath) {
                db.get("images")
                  .push({
                    origin: imgAddr,
                    oss: imagePath,
                    name: imageName,
                  })
                  .save();
              }
            } catch (error) {
              console.log(error);
            }
          }
          if (!imagePath) {
            imagePath = downloadToLocal(imgAddr);
          }
          if (imagePath) {
            dataStr = dataStr.replaceAll(imgAddr, imagePath);
          }
        }
      }
      fs.writeFileSync(filename, dataStr, "utf8");
    });
  }
}

function downloadToLocal(imgAddr) {
  const relativePath = `/images/${getImageName(imgAddr)}`;
  const localfilePath = path.join(publicDir, relativePath);
  request(imgAddr)
    .pipe(fs.createWriteStream(localfilePath))
    .on("error", function () {
      console.error(`download ${imgAddr} to ${localfilePath} failed`);
    });
  return relativePath;
}

function getImageName(imgAddr) {
  const tmpArr = imgAddr.split("#")[0].split("/");
  return tmpArr[tmpArr.length - 1];
}

async function uploadToOSS(imgAddr) {
  let client = new OSS({
    region: "oss-cn-hongkong",
    accessKeyId: process.env.OSS_ACCESS_KEY,
    accessKeySecret: process.env.OSS_SECRET_KEY,
    // stsToken: token.credentials.SecurityToken,
    bucket: "xyc-blog-images",
  });

  let stream;
  let pipf = await new Promise((resolve, reject) => {
    stream = request(imgAddr)
      .on("error", (err) => {
        resolve(0);
      })
      .on("response", (response) => {
        if (response.statusCode !== 200) {
          resolve(0);
        }
        resolve(1);
      })
      .pipe(PassThrough());
  });
  if (!pipf) {
    console.log("下载失败");
    return "";
  }
  let imageName = getImageName(imgAddr);
  let result = await client.putStream(imageName, stream);
  await client.putACL(result.name, "public-read");
  return `https://xyc-blog-images.oss-cn-hongkong.aliyuncs.com/${result.name}`;
}

function uploadToSMMS(imgAddr) {
  return new Promise((resolve, reject) => {
    let agent =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36";
    let readableStream = request(imgAddr);
    const form = new FormData();
    form.append("smfile", readableStream);
    const req = https.request(
      {
        hostname: "sm.ms",
        port: "443",
        path: "/api/v2/upload?inajax=1",
        method: "POST",
        headers: form.getHeaders(),
        timeout: 10000,
      },
      (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error("statusCode=" + res.statusCode));
        }
        res.setEncoding("utf8");
        let imageNewAddr = "";
        res.on("data", function (chunk) {
          try {
            body = JSON.parse(String(chunk));
            if (body.success) {
              imageNewAddr = body.data.url;
            } else {
              const tmpArr = body.error.split(" ");
              const tmpStr = tmpArr[tmpArr.length - 1];
              if (tmpStr.startsWith("https")) {
                imageNewAddr = tmpStr;
              } else {
                return reject(body.error);
              }
            }
          } catch (e) {
            return reject(e);
          }
          resolve(imageNewAddr);
        });
      }
    );
    req.setTimeout(10000);
    req.setHeader("origin", "https://sm.ms");
    req.setHeader("referer", "https://sm.ms/");
    req.setHeader("user-agent", agent);
    req.setHeader("x-requested-with", "XMLHttpRequest");
    form.pipe(req).on("error", function (err) {
      console.log(`read ${imgAddr} stream failed: ${err}`);
    });
  });
}

setTimeout(() => {
  process.exit(0);
}, 10000);

readDir(publicDir);
