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
const port = "3002";
app.use(cors({origin:"*"}));
app.listen(port, () => {
    console.log("app runs at port: " + port);
});
app.get("/search",async (req, res) => {
    let search = req.query.q;
    // let f = fs.readFileSync(path.join(__dirname,"./json2.json"),"utf8");
    // let rr = (editResponse(f));
    console.log(search);
    let rr = editResponse(await searchFunction(search));
    // rr = {thiss:{test:"works"}}
    res.status(200);
    res.json(rr);
    console.log(rr);
});
function funcPromise(data,resolve,reject){
    let id = setInterval(()=>{
        if(data.current === undefined){
            reject(data);
            clearInterval(id);
        }else if(data.current !=null){
            resolve(data);
            clearInterval(id);
        }
    },450);
}

async function searchFunction(txt) {
    const data = {current:null};
    https.get("https://www.youtube.com/results?search_query="+ txt).on("response", (res) => {
        let string = [];
        res.on("data", (data) => {
            string.push(data);
        });
        res.on("end",()=>{
            string = Buffer.concat(string).toString();
            // console.log(string);
            let string2 = string;
            let intialDataIndex = string2.indexOf("ytInitialData") + 16;//+16 to exclude (ytInitialData = ) from json
            let finalIndexOfIntial = string2.indexOf("</script>",intialDataIndex) - 1; // exclude (;) from json
            string2 = string2.substring(intialDataIndex,finalIndexOfIntial);
            let json = JSON.parse(string2);
            json = json["contents"]["twoColumnSearchResultsRenderer"]["primaryContents"]["sectionListRenderer"]["contents"][0]["itemSectionRenderer"]["contents"];
            string = string.replaceAll(/<a style="display: none;" href=\"\/\"/ig,`<a style="display: none;" href="http://127.0.0.1:5500/Youtube/?"`);
            // fs.writeFileSync("./html.html",string);
            // fs.writeFileSync("./json2.json",JSON.stringify(json));
            // fs.writeFileSync("./json.json",string2);
            data.current = json;
        });
    });
    await new Promise(async (resolve,rejects)=>{
        funcPromise(data,resolve,rejects);
    });
    return data.current;
}

async function editResponse(json1) {
    const json = { items: [] };
    // let arr = JSON.parse(string);
    let arr = json1;
    for (let el of arr) {
        let obj = { contentDetails: {}, id: {}, publishedAt: {}, snippet: {  thumbnails: { medium: {}, "default": {} } } };
        if (el["channelRenderer"]) {
            for(let i in el["channelRenderer"]["thumbnail"]["thumbnails"]){
                if (!el["channelRenderer"]["thumbnail"]["thumbnails"][i]["url"].includes("http")) {
                    el["channelRenderer"]["thumbnail"]["thumbnails"][i]["url"] = "https:" + el["videoRenderer"]["thumbnail"]["thumbnails"][1]["url"];
                }
                obj["snippet"]["thumbnails"]["medium"]["url"] = el["channelRenderer"]["thumbnail"]["thumbnails"][i]["url"];
                obj["snippet"]["thumbnails"]["default"]["url"] = el["channelRenderer"]["thumbnail"]["thumbnails"][i]["url"];
            }
            obj["snippet"]["channelTitle"] = el["channelRenderer"]["title"]["simpleText"];
            obj["snippet"]["title"] = el["channelRenderer"]["title"]["simpleText"];
            obj["contentDetails"].duration = undefined;
        } else if (el["videoRenderer"]) {
            for(let i in el["videoRenderer"]["thumbnail"]["thumbnails"]){
                if (!el["videoRenderer"]["thumbnail"]["thumbnails"][i]["url"].includes("http")) {
                    el["videoRenderer"]["thumbnail"]["thumbnails"][i]["url"] = "https:" + el["videoRenderer"]["thumbnail"]["thumbnails"][1]["url"];
                }
                obj["snippet"]["thumbnails"]["medium"]["url"] = el["videoRenderer"]["thumbnail"]["thumbnails"][i]["url"];
                obj["snippet"]["thumbnails"]["default"]["url"] = el["videoRenderer"]["thumbnail"]["thumbnails"][i]["url"];
            }
            obj["snippet"]["title"] = el["videoRenderer"]["title"]["runs"][0]["text"];
            obj["id"]["videoId"] = el["videoRenderer"]["videoId"];
            obj["snippet"]["channelTitle"] = el["videoRenderer"]["longBylineText"]["runs"][0]["text"];
            obj["contentDetails"].duration = el["videoRenderer"]["lengthText"]["simpleText"];
        }
        else {
            continue;
        }
        json.items.push(obj);
    }
    return json;
}
