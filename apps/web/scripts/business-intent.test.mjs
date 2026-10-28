import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyBusinessIntent } from '../src/lib/ai/business-intent.mjs';

const cases = [
  ['Hi everyone, thanks for the update', 'conversation'],
  ['好的，收到，谢谢', 'conversation'],
  ['สวัสดีครับ ขอบคุณมาก', 'conversation'],
  ['请问报价从 RMB 320,000 改到 RMB 350,000 可以吗？', 'quote_change'],
  ['ราคาจาก 120000 บาท เป็น 125000 บาท', 'quote_change'],
  ['交期要提前10天，供应商尚未确认', 'quote_change'],
  ['กำหนดส่งเลื่อนเป็นวันจันทร์หน้า', 'quote_change'],
  ['图纸修改成100mm厚度', 'requirement'],
  ['เปลี่ยนแปลงสเปกวัสดุ', 'requirement'],
  ['Supplier delivery delayed due to nonconformity', 'risk'],
  ['交货有风险，可能延期', 'risk'],
  ['อนุมัติแล้ว ให้ดำเนินการ', 'decision'],
  ['Please confirm receipt?', 'question'],
  ['已上传附件 PDF v3', 'file_update'],
];
for (const [message, expected] of cases) {
  test(`intent: ${message}`, () => {
    const actual = classifyBusinessIntent(message);
    assert.equal(actual.intent,expected);
    assert.equal(actual.provider,'rules');
    assert.ok(actual.needsDeepAnalysisProbability >= 0 && actual.needsDeepAnalysisProbability <= 1);
    assert.ok(actual.highRiskProbability >= 0 && actual.highRiskProbability <= 1);
  });
}
test('empty and small talk do not escalate', () => {
  for(const text of ['', 'yes', 'thanks', '谢谢', 'รับทราบ']) {
    assert.equal(classifyBusinessIntent(text).intent,'conversation');
  }
});
