import { RULES } from "../data/rules"
export interface ApplicationPackage { flyer:boolean; publicPurpose:string; invoiceTo:string; reimbursement:boolean; amount:number; amazon:boolean; mealCost:number; attendees:number; businessMealsForm:boolean; attendanceList:boolean }
export const EMPTY_PACKAGE: ApplicationPackage = {flyer:false,publicPurpose:"",invoiceTo:"",reimbursement:true,amount:0,amazon:false,mealCost:0,attendees:0,businessMealsForm:false,attendanceList:false}
export interface PreflightItem { field:string; ruleId:string; severity:"missing"|"risk"; text:string }
export function checkPreflight(raw: Partial<ApplicationPackage>) {
  const issues:PreflightItem[]=[]
  const add=(field:string,ruleId:string,text:string,severity:PreflightItem["severity"]="missing")=>issues.push({field,ruleId,text,severity})
  if(raw.flyer!==true)add("flyer","R11","Attach the event flyer.")
  if(typeof raw.publicPurpose!=="string"||!raw.publicPurpose.trim())add("publicPurpose","R11","Explain the public purpose.")
  if(typeof raw.invoiceTo!=="string"||!/^(ASU|Arizona State University)$/i.test(raw.invoiceTo.trim()))add("invoiceTo","R11","Address the invoice to ASU.")
  if(!Number.isFinite(raw.amount)||Number(raw.amount)<0)add("amount","R11","Enter a valid non-negative request amount.")
  if(raw.reimbursement===true && Number(raw.amount)>999)add("amount","R11","Reimbursements are capped at $999; ask USG about another purchase route.")
  if(raw.amazon===true)add("amazon","R11","Amazon purchases may not be reimbursed. Confirm with USG before buying.","risk")
  if(!Number.isFinite(raw.mealCost)||Number(raw.mealCost)<0||!Number.isInteger(raw.attendees)||Number(raw.attendees)<0||(Number(raw.mealCost)>0&&Number(raw.attendees)<1))add("mealCost","R12","Enter meal cost and a positive whole-number attendance estimate before checking the threshold.")
  if(Number(raw.mealCost)>0&&Number(raw.attendees)>0&&Number(raw.mealCost)/Number(raw.attendees)>=25){
    if(raw.businessMealsForm!==true)add("businessMealsForm","R12","At $25 or more per person, attach the Business Meals Form.")
    if(raw.attendanceList!==true)add("attendanceList","R12","At $25 or more per person, attach the attendance list.")
  }
  return {ready:issues.length===0,issues,rules:RULES.filter(r=>["R11","R12"].includes(r.id))}
}
