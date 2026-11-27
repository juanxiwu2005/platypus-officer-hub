import type { ConstitutionDoc } from "../../../components/setup/ConstitutionStep"
import { MAX_DOC_CHARS, documentSource, readDocumentFile } from "../../../lib/readDocument"
import { onboardingCopy } from "../../copy"

const text = onboardingCopy.founder.constitution

/**
 * Prepare constitution text for the walkthrough: read the file in this browser, hide emails and phone numbers, refuse credentials, fingerprint it.
 * It uses the shared helpers in lib/readDocument.ts.
 * Nothing is sent anywhere here.
 */
export async function prepareDoc(fileName: string, raw: string, file?: File): Promise<ConstitutionDoc> {
  const body = file ? await readDocumentFile(file) : raw.replace(/\r\n?/g, "\n").trim()
  if (body.length < 20) throw new Error(text.tooShort)
  if (body.length > MAX_DOC_CHARS) throw new Error(text.tooLong)
  const src = await documentSource(body, fileName)
  return { fileName, text: src.text, checksum: src.checksum }
}
