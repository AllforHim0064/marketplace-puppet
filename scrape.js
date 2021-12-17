const cron = require('node-cron');

//const puppeteer = require('puppeteer')
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())
var fs = require('fs')

var arrayOfItems;

// UPDATE WITH YOUR LOCATION REFERENCE FROM STEP 4
let locationRef = 'change'

// UPDATE WITH ITEMS YOU WANT TO SEARCH FOR
let searchTerms = ['cnc']

const nodemailer = require('nodemailer');

// UPDATE WITH EMAIL YOU WANT TO RECEIVE AT
let emailRecipient = "change"

// UPDATE WITH YOUR SENDING EMAIL ACCOUNT
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'change@gmail.com',
      pass: 'change' 
    }
  });

// UPDATE WITH YOUR SENDING EMAIL ACCOUNT
function sendEmail(emailRecipient, searchTerm, items){
  var message = "See new items below: \n\n"
    for (var a=0;a<items.length;a++){
        var item_string = `${items[a].title} - ${items[a].price}\n${items[a].link}\n\n`;
        message = message + item_string
    }
  const mailOptions = {
        from: '"Marketplace Alert" change@gmail.com',
        to: emailRecipient,
        subject: `${items.length} new items listed under ${searchTerm}`,
        text: message
      };
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
}

async function getItems(){
  fs.readFile('./pastItems.json', 'utf-8', function(err, data) {
  arrayOfItems = JSON.parse(data);
  })
  const browser = await puppeteer.launch({headless: false})
  const page = await browser.newPage()
  for (var i=0;i<searchTerms.length;i++){
    var newItems = [];
    var searchTerm = searchTerms[i].replace(/ /g,'%20');    
    console.log(`\nResults for ${searchTerms[i]}:\n`)
    await page.goto(`https://www.facebook.com/marketplace/${locationRef}/search/?daysSinceListed=1&sortBy=best_match&query=${searchTerm}&exact=false`)
    let bodyHTML = await page.evaluate(() => document.body.outerHTML);
    let searchResult = JSON.parse(bodyHTML.split(/(?:"marketplace_search":|,"marketplace_seo_page")+/)[2]);
    let items = searchResult["feed_units"]["edges"]
    await page.waitForTimeout(5000)
    if (items.length > 1){
		try {
      items.forEach((val, index)=>{
        var ID1 = val['node']['listing']['id'];
        var link = `https://www.facebook.com/marketplace/item/${val['node']['listing']['id']}`;
        var title = val['node']['listing']['marketplace_listing_title'];
        var price = val['node']['listing']['listing_price']['formatted_amount'];
        var item = {title: title, price: price, link: link}
        if (arrayOfItems.pastItems.includes(ID1)){
        } else {
          arrayOfItems.pastItems.push(ID1)
          newItems.push(item);  
          console.log(item)
        } 
      });
		} catch (err) {
    console.error(err.message);
  }
    }
	if (newItems.length>0){
		sendEmail(emailRecipient, searchTerms[i], newItems);
	} else {
		console.log('No new items for ' + searchTerms[i]);
	}
  };
  await browser.close()
  fs.writeFile('./pastItems.json', JSON.stringify(arrayOfItems), 'utf-8', function(err) {
    if (err) throw err
    console.log('Updated past items')
  })
}
getItems()
// TO CHANGE CRON TIME SCHEDULE
// https://www.npmjs.com/package/node-cron
cron.schedule('*/10 * * * *', function() {
  getItems()
});
//getItems()
