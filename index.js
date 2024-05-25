import https from "https";
import fs from "fs";
import cors from "cors";
import express from "express";
import { fileURLToPath } from "url";
import path, { dirname, resolve } from "path";
import { rejects } from "assert";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
app.use(express.json());
String.prototype.escaped = function () {
    return encodeURI(this);
}
const port = "3002";
app.use(cors({ origin: "*" }));
app.listen(port, () => {
    console.log("app runs at port: " + port);
});
app.get("/search", async (req, res) => {
    let search = req.query.q;
    let link = "results?search_query=" + search;
    console.log(link);
    let rr = await editResponse(await searchFunction(link));
    res.status(200);
    res.json(rr);
    console.log(rr);
    console.log("response done");
});
app.get("/get", async (req, res) => {
    let search = req.query.q;
    let link = "/" + search + "/videos";
    console.log(link);
    let rr = await editResponse(await searchFunction(link));
    res.status(200);
    res.json(rr);
    console.log(rr);
    console.log("response done");
});
app.get("/", (req, res) => {
    res.status(200).sendFile(path.join(__dirname, "./youtube.html"));
});
function funcPromise(data, resolve, reject) {
    let id = setInterval(() => {
        if (data.current === undefined) {
            reject(data);
            clearInterval(id);
        } else if (data.current != null) {
            resolve(data);
            clearInterval(id);
        }
    }, 450);
}

async function searchFunction(txt) {
    const data = { current: null };
    let options = {
        hostname: "www.youtube.com",
        path: `/${txt.escaped()}`,
        method: "GET",
        headers: {
            "accept-language": "en-EG"
        }
    };
    https.get(options).on("response", (res) => {
        let string = [];
        res.on("data", (data) => {
            string.push(data);
        });
        res.on("end", () => {
            string = Buffer.concat(string).toString();
            let string2 = string;
            let intialDataIndex = string2.indexOf("ytInitialData") + 16;//+16 to exclude (ytInitialData = ) from json
            let finalIndexOfIntial = string2.indexOf("</script>", intialDataIndex) - 1; // exclude (;) from json
            string2 = string2.substring(intialDataIndex, finalIndexOfIntial);
            let json = JSON.parse(string2);
            let dataPlace = json["contents"]["twoColumnSearchResultsRenderer"]["primaryContents"]["sectionListRenderer"]["contents"];
            let index = 0;
            // dataPlace[0]["itemSectionRenderer"]["contents"].forEach((current,i) => {
            // });
            for (let i in dataPlace) {
                try{
                    let current = dataPlace[i]["itemSectionRenderer"]["contents"][0];
                    if ("channelRenderer" in current || "videoRenderer" in current || "playlistRenderer" in current) {
                        index = i;
                        break;
                    }
                }catch{
                    console.log(dataPlace);
                }
            }
            json = dataPlace[index]["itemSectionRenderer"]["contents"];
            //debugging part
            // fs.writeFileSync("C:/Users/Prime11/Desktop/test/JDebuggingNotEdited.json", JSON.stringify(string2));
            // fs.writeFileSync("C:/Users/Prime11/Desktop/test/JDebugging.json", JSON.stringify(json));
            // fs.writeFileSync("C:/Users/Prime11/Desktop/test/HDebugging.html", string);
            // fs.writeFileSync("C:/Users/Prime11/Desktop/test/ItemsDebugging.json", JSON.stringify(editResponse(json)));
            //________________
            data.current = json;

        });
    });
    await new Promise(async (resolve, rejects) => {
        funcPromise(data, resolve, rejects);
    });
    return data.current;
}

async function editResponse(json1) {
    const json = { items: [] };
    let arr = json1;
    for (let el of arr) {
        let obj = { contentDetails: {}, id: {}, publishedAt: {}, snippet: { thumbnails: { medium: {}, "default": {} } } };
        if (el["channelRenderer"]) {
            for (let i in el["channelRenderer"]["thumbnail"]["thumbnails"]) {
                if (!el["channelRenderer"]["thumbnail"]["thumbnails"][i]["url"].includes("http")) {
                    el["channelRenderer"]["thumbnail"]["thumbnails"][i]["url"] = "https:" + el["channelRenderer"]["thumbnail"]["thumbnails"][1]["url"];
                }
                obj["snippet"]["thumbnails"]["medium"]["url"] = el["channelRenderer"]["thumbnail"]["thumbnails"][i]["url"];
                obj["snippet"]["thumbnails"]["default"]["url"] = el["channelRenderer"]["thumbnail"]["thumbnails"][i]["url"];
            }
            obj["snippet"]["channelTitle"] = el["channelRenderer"]["title"]["simpleText"];
            obj["snippet"]["title"] = el["channelRenderer"]["title"]["simpleText"];
            obj["contentDetails"].duration = undefined;
            try {
                obj["snippet"]["publishedAt"] = el["channelRenderer"]["navigationEndpoint"]["browseEndpoint"]["canonicalBaseUrl"];
                obj["snippet"]["publishedAt"] = (obj["snippet"]["publishedAt"]).replace("/", "");
            } catch {
                obj["snippet"]["publishedAt"] = "@" + obj["snippet"]["title"];
            }
        } else if (el["videoRenderer"]) {
            for (let i in el["videoRenderer"]["thumbnail"]["thumbnails"]) {
                if (!el["videoRenderer"]["thumbnail"]["thumbnails"][i]["url"].includes("http")) {
                    el["videoRenderer"]["thumbnail"]["thumbnails"][i]["url"] = "https:" + el["videoRenderer"]["thumbnail"]["thumbnails"][1]["url"];
                }
                obj["snippet"]["thumbnails"]["medium"]["url"] = el["videoRenderer"]["thumbnail"]["thumbnails"][i]["url"];
                obj["snippet"]["thumbnails"]["default"]["url"] = el["videoRenderer"]["thumbnail"]["thumbnails"][i]["url"];
            }
            obj["snippet"]["title"] = el["videoRenderer"]["title"]["runs"][0]["text"];
            obj["id"]["videoId"] = el["videoRenderer"]["videoId"];
            obj["snippet"]["channelTitle"] = el["videoRenderer"]["longBylineText"]["runs"][0]["text"];
            try {
                obj["snippet"]["publishedAt"] = el["videoRenderer"]["publishedTimeText"]["simpleText"];
            }
            catch {
                obj["snippet"]["publishedAt"] = " ";
            }
            if (el["videoRenderer"]["lengthText"])
                obj["contentDetails"].duration = el["videoRenderer"]["lengthText"]["simpleText"];
        }
        else if (el['playlistRenderer']) {
            let finalImage = el["playlistRenderer"]["thumbnails"][0]["thumbnails"].length;
            for (let i in el["playlistRenderer"]["thumbnails"][0]["thumbnails"]) {
                if (!el["playlistRenderer"]["thumbnails"][0]["thumbnails"][i]["url"].includes("http")) {
                    el["playlistRenderer"]["thumbnails"][0]["thumbnails"][i]["url"] = "https:" + el["playlistRenderer"]["thumbnails"][0]["thumbnails"][1]["url"];
                }
                obj["snippet"]["thumbnails"]["medium"]["url"] = el["playlistRenderer"]["thumbnails"][0]["thumbnails"][i]["url"];
                obj["snippet"]["thumbnails"]["default"]["url"] = el["playlistRenderer"]["thumbnails"][0]["thumbnails"][i]["url"];
            }
            obj["snippet"]["channelTitle"] = el["playlistRenderer"]["title"]["simpleText"];
            obj["snippet"]["title"] = el["playlistRenderer"]["title"]["simpleText"];
            obj["contentDetails"].duration = undefined;
            try {
                obj["snippet"]["publishedAt"] = el["playlistRenderer"]["navigationEndpoint"]["browseEndpoint"]["canonicalBaseUrl"];
                obj["snippet"]["publishedAt"] = (obj["snippet"]["publishedAt"]).replace("/", "");
            } catch {
                obj["snippet"]["publishedAt"] = "@" + obj["snippet"]["title"];
            }
        }
        else {
            continue;
        }
        json.items.push(obj);
    }
    return json;
}