const fetch = require("node-fetch")
const cheerio = require("cheerio")
const fs = require("fs")
const process = require("process")
const argv = require('minimist')(process.argv.slice(2))

const headerExeptions = require("./h2Exeptions")
const urlExeptions = require("./urlExeptions")
const removeText = require("./removeFromText")

const output = {}
const links = []

const amountNeeded = 100

let url = "https://www.startpagina.nl/"
let saveFile = __dirname + "data.json"
// handles all the options

for (let opt in argv) {
  if (argv.hasOwnProperty(opt)) {
    const arg = argv[opt];
    

    switch (opt) {

      case "_":
        arg.forEach((x, i) => {
          if(x.search(/[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&\/=]*)/gi) != -1) {
            // is url
            url = x;
          } else {
            const p = require("./package")        
            console.log("not a valid url or something weird happend.\r\nreport this on github: ", p.repository+"/issues/new")
            process.exit()
          }
        })
        break;

      case "h":
      case "help":
        const options = require("./help")
      
        console.log("Usage: node index [url] [arguments]\r\n")
        console.log("Options: ")
        
        for (let option in options) {
          if (options.hasOwnProperty(option)) {
            const desc = options[option]
            console.log(`\t${option}\t\t${desc}`)
          }
        }
      
        console.log("")
        process.exit()
        break;

      case "v":
      case "version":
        const p = require("./package")
        console.log(p.name + " version: " + p.version)
        process.exit()
        break;

      case "s":
      case "save":
        saveFile = arg
        break;
      
      

      default:
        break;
    }


  }
}

console.log("ripping: " + url)

fetch(url)
  .then(res => res.text())
  .then(html => {
    const $ = cheerio.load(html);
    $(".column .block").each((i, elem) => {
      const text = $(elem).find("h2").text().trim();
      if(!headerExeptions.some(x => text.toLowerCase().indexOf(x) > -1) &&
          Object.keys(output).length < amountNeeded) {
        output[text] = [];   
        $(elem).find("div ul li a").each((i, elem) => {
          elem = $(elem)
          const url = cleanUrl(elem.attr("href"))
          let baseUrl = ""
          url.replace(/([a-z]+:\/\/)([a-z\d][a-z\d-]*(\:[a-z\d][a-z\d-]*)*@)?([a-z\d][a-z\d-]*(\.[a-z\d][a-z\d-]*)*)/g, (x) => {
            baseUrl = x;
          })

          if (url.search(/[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&\/=]*)/gi) != -1 &&
              !urlExeptions.some(x => url.toLowerCase().indexOf(x) > -1) &&
              links.indexOf(baseUrl) == -1 &&
              output[text].length <= 7) {

            output[text].push({
              text: cleanText(elem.text()),
              url: url,
            });

            links.push(baseUrl);
            
          }

        })
        if(output[text].length < 3) {
          delete output[text]
        }
      }
    })
    // console.log(output)
    // console.log("headers: " + Object.keys(output).length)
    fs.writeFile(saveFile, JSON.stringify(output), (err) => {
      if(err)
        console.log(err)
    })
  })

function cleanUrl(url) {
  return url.replace(/\?.*/, "");
}

function cleanText(str) {
  let output = str
  removeText.forEach((x) => {
    output = output
      .replace(x, "")
      .trim()
  })
  return output
}