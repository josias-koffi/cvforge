import { featureMetadata, featureRoute } from "@/lib/feature-route"

// Served at /en/tailored-resume-cover-letter and, through a rewrite in next.config, at its French slug.
export const generateMetadata = featureMetadata("tailored_documents")

export default featureRoute("tailored_documents")
