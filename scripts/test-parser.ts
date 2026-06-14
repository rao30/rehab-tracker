import { parseContractWithRules } from "../src/lib/contract-parser";
import { readFileSync } from "fs";

const samplePath = "/home/ubuntu/.cursor/projects/workspace/uploads/Independent_Contractor_Agreement_Jesse_signed_de26.pdf";

async function main() {
  const { extractTextFromPdf } = await import("../src/lib/contract-parser");
  const buffer = readFileSync(samplePath);
  const text = await extractTextFromPdf(buffer);
  const parsed = parseContractWithRules(text);
  console.log(JSON.stringify(parsed, null, 2));
}

main().catch(console.error);
