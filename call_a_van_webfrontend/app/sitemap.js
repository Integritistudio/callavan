/** Basic sitemap for Google Search discovery. */
export default function sitemap() {
  const base = 'https://www.callavan.live';
  const lastModified = new Date();

  return [
    { url: `${base}/`, lastModified, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/faq`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/driver-faq`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/terms-conditions`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/driver-terms`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/privacy-policy`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/contact`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
