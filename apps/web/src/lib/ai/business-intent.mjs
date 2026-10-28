/**
 * Fast, deterministic fallback. It is an intent filter, NOT a source of truth:
 * all proposed commercial changes still require model extraction or human review.
 * Run with Node in CI and Deno in the edge worker.
 */
const price = /(?:\b(?:RMB|CNY|USD|THB|EUR)\b|[$฿¥￥]\s*\d|\b(?:quote|quotation|price|payment|deposit|total|invoice|cost)\b|价格|报价|付款|支付|金额|人民币|美元|泰铢|总价|尾款|发票|ราคา|ใบเสนอราคา|ชำระเงิน|ค่าใช้จ่าย|ต้นทุน|มัดจำ|ยอดรวม)/iu;
const delivery = /(?:\b(?:delivery|lead\s*time|shipment|dispatch|late\s*delivery)\b|交期|交货|发货|到货|延期|延迟交付|กำหนดส่ง|ส่งมอบ|จัดส่ง|เลื่อนส่ง|ล่าช้า)/iu;
const requirement = /(?:\b(?:requirement|spec(?:ification)?|thickness|drawing|dimension|quantity|material|revision|scope|standard)\b|图纸|规格|材质|厚度|数量|标准|技术要求|变更|版本|修订|设计|แบบ|สเปก|จำนวน|แก้ไข|เปลี่ยนแปลง|วัสดุ|ข้อกำหนด)/iu;
const decision = /(?:\b(?:approved|approval|agreed|accepted|finalized|sign\s*off|proceed)\b|确认订单|确认交期|批准|已经同意|正式同意|最终确定|就按这个|อนุมัติ|ตกลงราคา|ยืนยันการสั่งซื้อ|อนุมัติแล้ว)/iu;
const question = /(?:[?？]|\b(?:could you|can you|please confirm|would you|what if)\b|是否|能否|请确认|什么时候|吗[？?]?|กรุณายืนยัน|ได้ไหม|หรือไม่|เมื่อไร)/iu;
const risk = /(?:\b(?:risk|delay(?:ed)?|late|blocked|failed|defect|nonconform(?:ity|ance)?|dispute|overdue|breach)\b|风险|延误|违约|缺陷|错误|不合格|未通过|索赔|异常|ปัญหา|ผิดพลาด|ไม่ผ่าน|ล่าช้า|เสี่ยง)/iu;
const file = /(?:\b(?:attached|attachment|pdf|dwg|xlsx|file|document|version|v[0-9]+)\b|附件|已上传|上传文件|新版图纸|เอกสารแนบ|ไฟล์|แนบไฟล์|เวอร์ชัน)/iu;

export function classifyBusinessIntent(input) {
  const message = typeof input === "string" ? input.trim().slice(0, 12000) : "";
  if (!message) return {intent:"conversation",needsDeepAnalysisProbability:0.05,highRiskProbability:0.05,urgency:"low",provider:"rules"};
  const money = price.test(message), lead = delivery.test(message), spec = requirement.test(message);
  const ask = question.test(message), issue = risk.test(message), docs = file.test(message);
  const approval = decision.test(message) && !/\b(?:please confirm|could you confirm|not approved|not accepted)\b|请确认|尚未批准|未同意|กรุณายืนยัน|ยังไม่อนุมัติ/iu.test(message);
  let intent = "conversation";
  // Explicit material risk outranks mere quoted approval.
  if (issue) intent = "risk";
  else if (money || lead) intent = "quote_change";
  else if (spec) intent = "requirement";
  else if (approval) intent = "decision";
  else if (docs) intent = "file_update";
  else if (ask) intent = "question";
  const material = money || lead || issue || approval || spec;
  return {
    intent,
    needsDeepAnalysisProbability: intent === "conversation" ? 0.08 : material ? 0.9 : 0.6,
    highRiskProbability: issue ? 0.9 : (money || lead || approval) ? 0.8 : spec ? 0.55 : 0.1,
    urgency: issue ? "high" : material ? "normal" : "low",
    provider: "rules",
  };
}
