import https from "https";
import fs from "fs";
https.get("https://www.youtube.com/results?search_query=thiojoe").on("response", (res) => {
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
        fs.writeFileSync("./html.html",string);
        fs.writeFileSync("./json2.json",JSON.stringify(json));
        fs.writeFileSync("./json.json",string2);
    })
});