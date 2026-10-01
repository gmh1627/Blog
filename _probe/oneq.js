const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({headless:true,executablePath:'C:/Users/admin/AppData/Local/ms-playwright/chromium-1187/chrome-win/chrome.exe'});
const p=await b.newPage({viewport:{width:1280,height:900}});
await p.goto('https://www.prestige-av.com/goods?searchText='+encodeURIComponent('公衆トイレ'),{waitUntil:'networkidle',timeout:60000});
console.log('before',p.url(),(await p.locator('body').innerText()).slice(-500));
const yes=p.getByText('はい',{exact:true});console.log('yes',await yes.count());
if(await yes.count()){await yes.click();await p.waitForTimeout(5000);}
console.log('after',p.url(),(await p.locator('body').innerText()).slice(-1200));
console.log('links',await p.locator('a[href*="skuId="]').count());
await b.close();
})();
