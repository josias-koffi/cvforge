import { featureOgImage, featureOgParams } from "@/lib/feature-route"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "CVSpark"

export const generateStaticParams = featureOgParams

export default featureOgImage("tailored_documents")
