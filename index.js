import https from "https";
import fs from "fs";
import cors from "cors";
import express from "express";
import { fileURLToPath } from "url";
import path, { dirname, resolve } from "path";
import { rejects } from "assert";
import { channel } from "diagnostics_channel";
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
    let rr = await searchData(link);
    res.status(200);
    res.json(rr);
    //console.log(rr);
    console.log("response done");
});
app.get("/channel", async (req, res) => {
    let search = req.query.q;
    let link = search + "/videos";
    //console.log(link);
    let rr = await listChannel(link);
    res.status(200);
    res.json(rr);
    //console.log(rr);
    //console.log("response done");
});
app.get("/", (req, res) => {
    res.status(200).sendFile(path.join(__dirname, "./youtube.html"));
});
async function searchData(txt) {
    let json = await getData(txt);
    let dataPlace = json["contents"]["twoColumnSearchResultsRenderer"]["primaryContents"]["sectionListRenderer"]["contents"];
    //finding the index of object that includes channelRender or videoRenderer or playlistRenderer that includes the main elements to render video card
    let index = 0;
    for (let i in dataPlace) {
        try {
            let current = dataPlace[i]["itemSectionRenderer"]["contents"][0];
            if ("channelRenderer" in current || "videoRenderer" in current || "playlistRenderer" in current) {
                index = i;
                break;
            }
        } catch {
            //console.log(dataPlace);
        }
    }
    json = dataPlace[index]["itemSectionRenderer"]["contents"];
    return editResponseForSearch(json);
}
async function listChannel(channelID) {
    let json = await getData(channelID);
    let channalOBJ = {};
    channalOBJ.channelImg = json.header.c4TabbedHeaderRenderer.avatar.thumbnails[json.header.c4TabbedHeaderRenderer.avatar.thumbnails.length];
    channalOBJ.channelTitle = json.header.c4TabbedHeaderRenderer.title;
    json = json["contents"]["twoColumnBrowseResultsRenderer"]["tabs"];
    //find the object that includes tabs>[index?]>tabRenderer>content
    //the content
    let index = 0;
    for (let i in json) {
        try {
            let current = json[i]["tabRenderer"];
            if ("content" in current) {
                index = i;
                break;
            }
        } catch {
            //console.log(dataPlace);
        }
    }
    json = json[index]["tabRenderer"]["content"]["richGridRenderer"]["contents"];
    return editResponseForChannel(json, channalOBJ);
}
async function editResponseForChannel(json1, channelOBJ) {
    const json = { items: [] };
    let arr = json1;
    for (let el of arr) {
        let obj = { contentDetails: {}, id: {}, channelImg: undefined, publishedAt: {}, snippet: { thumbnails: { medium: {}, "default": {} } } };
        if (el["richItemRenderer"]) {
            let current = el["richItemRenderer"]["content"]["videoRenderer"];
            obj.id.videoId = current.videoId;
            obj.contentDetails.duration = current.lengthText.simpleText;
            obj.snippet.title = current.title.runs[0].text;
            obj.snippet.publishedAt = current.publishedTimeText.simpleText;
            obj.channelImg = channelOBJ.channelImg;
            obj.snippet.channelTitle = channelOBJ.channelTitle;
            for (let i in current.thumbnail.thumbnails) {
                let size = (i==0?"small":i==current.thumbnail.thumbnails.length -1?"medium":"defualt");
                obj.snippet.thumbnails[size] = current.thumbnail.thumbnails[i];
            }
            json.items.push(obj);
        }
    }
    return json;
}
function getData(txt) {
    return new Promise((resolve, reject) => {
        let options = {
            hostname: "www.youtube.com",
            path: `/${txt.escaped()}`,
            method: "GET",
            headers: {
                "accept-language": "en-EG"
            }
        };
        https.get(options).on("response", (res) => {
            try {
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
                    resolve(JSON.parse(string2));
                    res.removeAllListeners('data');
                    res.removeAllListeners('end');
                    //debugging part
                    // fs.writeFileSync("./JDebuggingNotEdited.json", JSON.stringify(string2));
                    // fs.writeFileSync("./JDebugging.json", JSON.stringify(JSON.parse(string2)));
                    // fs.writeFileSync("./HDebugging.html", string);
                    // fs.writeFileSync("./ItemsDebugging.json", JSON.stringify(editResponseForSearch(JSON.parse(string2))));
                    //________________
                });
            } catch (ex) {
                reject(ex);
                res.removeAllListeners('data');
                res.removeAllListeners('end');
            }
        });
    });
}

async function editResponseForSearch(json1) {
    const json = { items: [] };
    let arr = json1;
    for (let el of arr) {
        let obj = { contentDetails: {}, id: {}, channelImg: undefined, publishedAt: {}, snippet: { thumbnails: { medium: {}, "default": {} } } };
        if (el["channelRenderer"]) {
            for (let i in el["channelRenderer"]["thumbnail"]["thumbnails"]) {
                if (!el["channelRenderer"]["thumbnail"]["thumbnails"][i]["url"].includes("http")) {
                    el["channelRenderer"]["thumbnail"]["thumbnails"][i]["url"] = "https:" + el["channelRenderer"]["thumbnail"]["thumbnails"][1]["url"];
                }
                obj["snippet"]["thumbnails"]["medium"]["url"] = el["channelRenderer"]["thumbnail"]["thumbnails"][i]["url"];
                obj["snippet"]["thumbnails"]["default"]["url"] = el["channelRenderer"]["thumbnail"]["thumbnails"][i]["url"];
            }
            obj["snippet"]["channelTitle"] = "";//el["channelRenderer"]["title"]["simpleText"]";
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
                obj["channelImg"] = el["videoRenderer"]["channelThumbnailSupportedRenderers"]["channelThumbnailWithLinkRenderer"]["thumbnail"]["thumbnails"][0]["url"];
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
            obj["id"]["playlistId"] = el["playlistRenderer"]["playlistId"];
            obj["snippet"]["publishedAt"] = "";
        }
        else {
            continue;
        }
        json.items.push(obj);
    }
    return json;
}