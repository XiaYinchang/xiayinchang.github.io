var fs = require("fs");
var path = require("path");
var https = require("https");
var FormData = require("form-data");
const request = require("request");
const uuidv4 = require("uuid/v4");

var publicDir = "./public";
// Loop through all the files in the temp directory
function readDir(dir) {
  fs.readdir(dir, function(err, files) {
    if (err) {
      console.error("Could not list the directory.", err);
      process.exit(1);
    }

    files.forEach(function(file, index) {
      // Make one pass and make the file complete
      var relativePath = path.join(dir, file);

      fs.stat(relativePath, function(error, stat) {
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

function replaceImgAddr(filename) {
  const imageStr = String(fs.readFileSync("./imageMap.json", "utf8"));
  let imagesMap = JSON.parse(imageStr);

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
          let imageMap = imagesMap.images.find(ele => ele.origin === imgAddr);
          if (imageMap) {
            imagePath = imageMap.smms;
          } else {
            try {
              imagePath = await uploadToSMMS(imgAddr);
              if (imagePath) {
                imagesMap.images.push({ origin: imgAddr, smms: imagePath });
                fs.writeFileSync(
                  "./imageMap.json",
                  JSON.stringify(imagesMap),
                  "utf8"
                );
              }
            } catch (error) {
              console.log(error);
            }
          }
          if (!imagePath) {
            imagePath = downloadToLocal(imgAddr);
          }
          if (imagePath) {
            dataStr = dataStr.replace(imgAddr, imagePath);
          }
        }
      }
      fs.writeFileSync(filename, dataStr, "utf8");
    });
  }
}

function downloadToLocal(imgAddr) {
  // const localfileName = uuidv4();
  const tmpArr = imgAddr.split("#")[0].split("/");
  const imageName = tmpArr[tmpArr.length - 1];
  const relativePath = `/images/${imageName}`;
  const localfilePath = path.join(publicDir, relativePath);
  request(imgAddr)
    .pipe(fs.createWriteStream(localfilePath))
    .on("error", function() {
      console.error(`download ${imgAddr} to ${localfilePath} failed`);
    });
  return relativePath;
}

function uploadToSMMS(imgAddr) {
  return new Promise((resolve, reject) => {
    let readableStream = request(imgAddr);
    const form = new FormData();
    form.append("smfile", readableStream);
    const req = https.request(
      {
        hostname: "sm.ms",
        port: "443",
        path: "/api/v2/upload?inajax=1",
        method: "POST",
        headers: form.getHeaders()
      },
      res => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error("statusCode=" + res.statusCode));
        }
        res.setEncoding("utf8");
        let imageNewAddr = "";
        res.on("data", function(chunk) {
          try {
            body = JSON.parse(String(chunk));
            if (body.success) {
              imageNewAddr = body.data.url;
            } else {
              const tmpArr = body.error.split(" ");
              const tmpStr = tmpArr[tmpArr.length - 1];
              if (tmpStr.startsWith("https")) {
                imageNewAddr = tmpStr;
              }
            }
          } catch (e) {
            reject(e);
          }
          resolve(imageNewAddr);
        });
      }
    );
    req.setHeader("origin", "https://sm.ms");
    req.setHeader("referer", "https://sm.ms/");
    req.setHeader(
      "user-agent",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36"
    );
    form.pipe(req);
  });
}

readDir(publicDir);
