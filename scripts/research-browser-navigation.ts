import type {Locator,Page} from 'playwright-core';
export async function openResearch(page:Page,section='models'){
 await page.getByTestId('workflow-tab-research').locator(':visible').first().click();
 await page.getByTestId(`research-section-${section}`).click();
 if(section==='models') await page.getByTestId('research-advanced').evaluate(el=>{(el as HTMLDetailsElement).open=true;});
}
export async function chooseResearchExample(panel:Locator,label:string){
 await panel.getByTestId('research-advanced').evaluate(el=>{(el as HTMLDetailsElement).open=true;});
 const button=panel.getByRole('button',{name:label,exact:true,includeHidden:true});
 const topic=await button.locator('xpath=ancestor::*[@data-research-topic]').getAttribute('data-research-topic');
 if(!topic)throw new Error('Research example has no registered topic: '+label);
 await panel.getByTestId(`research-topic-${topic}`).click();
 await panel.getByRole('button',{name:label,exact:true}).click();
}
export async function selectLoadMode(page:Page,mode:'ongrid'|'offgrid'){
 await page.getByTestId('project-family-loads').click();
 await page.getByTestId(`load-mode-${mode}`).click();
}
