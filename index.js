const fetch = require('node-fetch')
const cheerio = require('cheerio')
const fs = require('fs')
const process = require('process')
const argv = require('minimist')(process.argv.slice(2))

const headerExeptions = require('./h2Exeptions')
const urlExeptions = require('./urlExeptions')
const removeText = require('./removeFromText')

// default settings
let amountNeeded = 100
let url = 'https://www.startpagina.nl/'
let saveFile = __dirname + '/data.json'
let minLinks = 3
let maxLinks = 7
let verbose = false

// handles all the options
for (let opt in argv) {
  if (argv.hasOwnProperty(opt)) {
    const arg = argv[opt]

    switch (opt) {
      case '_':
        arg.forEach((x, i) => {
          if (
            x.search(
              /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&\/=]*)/gi
            ) != -1
          ) {
            // is url
            url = x
          } else {
            const p = require('./package')
            console.log(
              'not a valid url or something weird happend.\r\nreport this on github: ',
              p.repository + '/issues/new'
            )
            process.exit()
          }
        })
        break

      case 'h':
      case 'help':
        const options = require('./help')

        console.log('Usage: node index [url] [arguments]\r\n')
        console.log('Options: ')

        for (let option in options) {
          if (options.hasOwnProperty(option)) {
            const desc = options[option]
            console.log(`\t${option}\t\t${desc}`)
          }
        }

        console.log('')
        process.exit()
        break

      case 'v':
      case 'version':
        const p = require('./package')
        console.log(p.name + ' version: ' + p.version)
        process.exit()
        break

      case 's':
      case 'save':
        saveFile = arg
        break

      case 'l':
      case 'limit':
        amountNeeded = arg
        break

      case 'min-links':
        minLinks = arg
        break

      case 'max-links':
        maxLinks = arg
        break

      case 'V':
      case 'verbose':
        verbose = true
        break

      default:
        console.log(
          "weird option, make sure you don't hove a typo or something, also checkout\r\nnode index --help"
        )
        process.exit()
        break
    }
  }
}

console.log('ripping: ' + url)

const output = {}
const links = []

fetch(url)
  .then(res => res.text())
  .then(html => {
    verbose && console.log('loaded html')
    const $ = cheerio.load(html)

    $('ul li a').each((i, elem) => {
      elem = $(elem)
      const text = getH2(elem)
        .text()
        .trim()
      const outputKeys = Object.keys(output)

      // check previous thing for too few link
      if (
        outputKeys.length > 0 &&
        outputKeys[outputKeys.length - 1] != text &&
        output[outputKeys[outputKeys.length - 1]].length < minLinks
      ) {
        verbose &&
          console.log(
            'removed: ',
            outputKeys[outputKeys.length - 1] + ':',
            output[outputKeys[outputKeys.length - 1]]
          )
        delete output[outputKeys[outputKeys.length - 1]]
      }

      if (
        !headerExeptions.some(
          x => text.toLowerCase().indexOf(x.toLowerCase()) > -1
        ) &&
        outputKeys.length <= amountNeeded
      ) {
        if (!output[text]) {
          output[text] = []
          verbose && console.log('added header: ', text)
        }
        verbose && console.log('started parsing: ', text, elem.text())

        const url = cleanUrl(elem.attr('href'))
        const anchorText = cleanText(elem.text())
        if (
          url.search(
            /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&\/=]*)/gi
          ) != -1 &&
          !urlExeptions.some(
            x => url.toLowerCase().indexOf(x.toLowerCase()) > -1
          ) &&
          output[text].length <= maxLinks &&
          links.indexOf(anchorText) === -1
        ) {
          output[text].push({
            text: anchorText,
            url
          })
          // add it to a filter list thingy
          links.push(anchorText)
          verbose &&
            output[text].length > 0 &&
            console.log('added link: ', output[text][output[text].length - 1])
        } else {
          verbose && console.log("didn't pass")
        }
      }

      // finds the nearest h2 and has a max of 3 times before stopping the search, prevents the nav bar from facking everything up
      function getH2(e, tries = 0) {
        const p = e.parent()
        if (p.find('h2').length === 0 && tries < 3) {
          return getH2(p, ++tries)
        } else {
          return p.find('h2')
        }
      }
    })

    const outputKeys = Object.keys(output)
    // check previous thing for too few link
    if (
      outputKeys.length > 0 &&
      output[outputKeys[outputKeys.length - 1]].length < minLinks
    ) {
      delete output[outputKeys[outputKeys.length - 1]]
    }

    // console.log(output)
    // console.log("headers: " + Object.keys(output).length)
    fs.writeFile(saveFile, JSON.stringify(output), err => {
      if (err) {
        console.log(err)
      } else {
        console.log('done!\r\nwritten to ' + saveFile)
      }
    })
  })

function cleanUrl(url) {
  return url.replace(/\?.*/, '')
}

function cleanText(str) {
  let output = str
  removeText.forEach(x => {
    output = output.replace(x, '').trim()
  })
  return output
}
