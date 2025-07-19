// ultra-fast-multi-section-fixed.js - Fixed CSS selectors
const puppeteer = require('puppeteer');

async function automateMultiSectionForm(formUrl, submissionCount = 50, tabCount = 5) {
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const ruralData = {
        locations: ['Dadara Hajo Village', 'Sualkuchi Village', 'Chaygaon Rural', 'Barpeta Road Village', 'Nalbari Rural', 'Rangia Village']
    };
    
    const submissionsPerTab = Math.ceil(submissionCount / tabCount);
    const promises = [];
    
    for (let tabIndex = 0; tabIndex < tabCount; tabIndex++) {
        const promise = async () => {
            const page = await browser.newPage();
            
            // Speed optimizations
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (['stylesheet', 'font', 'image'].includes(req.resourceType())) {
                    req.abort();
                } else {
                    req.continue();
                }
            });
            
            const startIndex = tabIndex * submissionsPerTab + 1;
            const endIndex = Math.min(startIndex + submissionsPerTab - 1, submissionCount);
            
            for (let i = startIndex; i <= endIndex; i++) {
                try {
                    console.log(`Tab ${tabIndex + 1}: ${i}/${submissionCount}`);
                    
                    await page.goto(formUrl, { waitUntil: 'domcontentloaded' });
                    await page.waitForSelector('form, div[role="main"]', { timeout: 3000 });
                    
                    let sectionCount = 1;
                    let maxSections = 10;
                    
                    while (sectionCount <= maxSections) {
                        console.log(`  Tab ${tabIndex + 1}: Section ${sectionCount} of form ${i}`);
                        
                        // Fill current section
                        await page.evaluate((ruralData, sectionCount) => {
                            // Fill text inputs
                            document.querySelectorAll('input[type="text"], textarea').forEach((input, index) => {
                                if (input.offsetParent !== null) {
                                    input.value = index === 0 && sectionCount === 1 ? 
                                        ruralData.locations[Math.floor(Math.random() * ruralData.locations.length)] :
                                        `Data-${Math.floor(Math.random() * 100)}-S${sectionCount}`;
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                }
                            });
                            
                            // Fill radio buttons
                            document.querySelectorAll('div[role="radiogroup"]').forEach(container => {
                                const options = container.querySelectorAll('div[role="radio"], div[data-value], span[data-value]');
                                if (options.length > 0) {
                                    options[Math.floor(Math.random() * options.length)].click();
                                }
                            });
                            
                            // Fill dropdowns
                            document.querySelectorAll('select').forEach(select => {
                                if (select.options.length > 1) {
                                    select.selectedIndex = Math.floor(Math.random() * (select.options.length - 1)) + 1;
                                    select.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                            });
                            
                            // Fill checkboxes
                            document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                                if (Math.random() > 0.5) {
                                    checkbox.checked = true;
                                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                            });
                        }, ruralData, sectionCount);
                        
                        // Wait for form processing
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        // Find Next and Submit buttons using page.evaluate
                        const buttonInfo = await page.evaluate(() => {
                            const buttons = document.querySelectorAll('div[role="button"], button, input[type="submit"]');
                            let nextButton = null;
                            let submitButton = null;
                            
                            buttons.forEach(button => {
                                const text = (button.textContent || button.value || button.getAttribute('aria-label') || '').toLowerCase();
                                const isVisible = button.offsetParent !== null;
                                const isDisabled = button.disabled || button.getAttribute('aria-disabled') === 'true';
                                
                                if (isVisible && !isDisabled) {
                                    if (text.includes('next') || text.includes('continue')) {
                                        nextButton = true;
                                    }
                                    if (text.includes('submit') || text.includes('send')) {
                                        submitButton = true;
                                    }
                                }
                            });
                            
                            return { hasNext: nextButton, hasSubmit: submitButton };
                        });
                        
                        if (buttonInfo.hasNext && !buttonInfo.hasSubmit) {
                            // Click Next button
                            await page.evaluate(() => {
                                const buttons = document.querySelectorAll('div[role="button"], button');
                                for (let button of buttons) {
                                    const text = (button.textContent || button.getAttribute('aria-label') || '').toLowerCase();
                                    if ((text.includes('next') || text.includes('continue')) && button.offsetParent !== null) {
                                        button.click();
                                        break;
                                    }
                                }
                            });
                            
                            console.log(`  Tab ${tabIndex + 1}: Clicked Next for section ${sectionCount}`);
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            sectionCount++;
                            
                        } else if (buttonInfo.hasSubmit) {
                            // Click Submit button
                            await page.evaluate(() => {
                                const buttons = document.querySelectorAll('div[role="button"], button');
                                for (let button of buttons) {
                                    const text = (button.textContent || button.getAttribute('aria-label') || '').toLowerCase();
                                    if ((text.includes('submit') || text.includes('send')) && button.offsetParent !== null) {
                                        button.click();
                                        break;
                                    }
                                }
                            });
                            
                            console.log(`✅ Tab ${tabIndex + 1}: ${i} submitted (${sectionCount} sections)`);
                            break;
                            
                        } else {
                            // Fallback - try standard submit selector
                            try {
                                await page.click('div[role="button"][aria-label*="Submit"]');
                                console.log(`✅ Tab ${tabIndex + 1}: ${i} submitted (fallback)`);
                                break;
                            } catch (e) {
                                console.log(`❌ Tab ${tabIndex + 1}: No submit button found for ${i}`);
                                break;
                            }
                        }
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 400));
                    
                } catch (error) {
                    console.error(`❌ Tab ${tabIndex + 1}: ${i} failed -`, error.message);
                }
            }
            
            await page.close();
        };
        
        promises.push(promise());
    }
    
    await Promise.all(promises);
    console.log('🎉 All tabs completed!');
    await browser.close();
}

// Usage
const formUrl = 'https://docs.google.com/forms/d/1kcony0sOP5w3jx0blHrpQCfxAR354O4iZYQxq_o1uVY/viewform';
automateMultiSectionForm(formUrl, 10, 5).catch(console.error);



// // ultra-fast-parallel.js - Run multiple forms simultaneously
// const puppeteer = require('puppeteer');

// async function automateParallel(formUrl, submissionCount = 50, tabCount = 5) {
//     const browser = await puppeteer.launch({ 
//         headless: true,
//         args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
//     });
    
//     const ruralData = {
//         locations: ['Dadara Hajo Village', 'Sualkuchi Village', 'Chaygaon Rural', 'Barpeta Road Village', 'Nalbari Rural', 'Rangia Village']
//     };
    
//     const submissionsPerTab = Math.ceil(submissionCount / tabCount);
//     const promises = [];
    
//     for (let tabIndex = 0; tabIndex < tabCount; tabIndex++) {
//         const promise = async () => {
//             const page = await browser.newPage();
            
//             // Speed optimizations
//             await page.setRequestInterception(true);
//             page.on('request', (req) => {
//                 if (['stylesheet', 'font', 'image'].includes(req.resourceType())) {
//                     req.abort();
//                 } else {
//                     req.continue();
//                 }
//             });
            
//             const startIndex = tabIndex * submissionsPerTab + 1;
//             const endIndex = Math.min(startIndex + submissionsPerTab - 1, submissionCount);
            
//             for (let i = startIndex; i <= endIndex; i++) {
//                 try {
//                     console.log(`Tab ${tabIndex + 1}: ${i}/${submissionCount}`);
                    
//                     await page.goto(formUrl, { waitUntil: 'domcontentloaded' });
//                     await page.waitForSelector('form, div[role="main"]', { timeout: 3000 });
                    
//                     // Single evaluate call for maximum speed
//                     await page.evaluate((ruralData) => {
//                         // Fill everything in one go
//                         document.querySelectorAll('input[type="text"], textarea').forEach((input, index) => {
//                             if (input.offsetParent !== null) {
//                                 input.value = index === 0 ? 
//                                     ruralData.locations[Math.floor(Math.random() * ruralData.locations.length)] :
//                                     `Data-${Math.floor(Math.random() * 100)}`;
//                                 input.dispatchEvent(new Event('input', { bubbles: true }));
//                             }
//                         });
                        
//                         document.querySelectorAll('div[role="radiogroup"]').forEach(container => {
//                             const options = container.querySelectorAll('div[role="radio"], div[data-value], span[data-value]');
//                             if (options.length > 0) {
//                                 options[Math.floor(Math.random() * options.length)].click();
//                             }
//                         });
                        
//                         document.querySelectorAll('select').forEach(select => {
//                             if (select.options.length > 1) {
//                                 select.selectedIndex = Math.floor(Math.random() * (select.options.length - 1)) + 1;
//                                 select.dispatchEvent(new Event('change', { bubbles: true }));
//                             }
//                         });
//                     }, ruralData);
                    
//                     await page.click('div[role="button"][aria-label*="Submit"]');
//                     console.log(`✅ Tab ${tabIndex + 1}: ${i}`);
                    
//                     await new Promise(resolve => setTimeout(resolve, 400));
                    
//                 } catch (error) {
//                     console.error(`❌ Tab ${tabIndex + 1}: ${i} failed`);
//                 }
//             }
            
//             await page.close();
//         };
        
//         promises.push(promise());
//     }
    
//     await Promise.all(promises);
//     console.log('🎉 All tabs completed!');
//     await browser.close();
// }

// // Usage - 5 tabs running in parallel
// const formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfnjhlW7fCU36bW_OxEzZIDqjBP1N9wQL-pWYM2EbCISRnFnQ/viewform?usp=header';
// automateParallel(formUrl, 10, 5).catch(console.error);
