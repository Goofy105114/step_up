export function setSeoTags(title: string, description: string, image?: string, url?: string) {
  // Update title
  document.title = title ? `${title} | StepUp` : 'StepUp — Premium Footwear';

  // Meta description
  let descMeta = document.querySelector('meta[name="description"]');
  if (!descMeta) {
    descMeta = document.createElement('meta');
    descMeta.setAttribute('name', 'description');
    document.head.appendChild(descMeta);
  }
  descMeta.setAttribute('content', description || 'Premium footwear for every step of your journey.');

  // OG tags (social media)
  setOgTag('og:title', title || 'StepUp');
  setOgTag('og:description', description || 'Premium footwear for every step of your journey.');
  if (image) setOgTag('og:image', image);
  if (url) setOgTag('og:url', url);
  setOgTag('og:type', 'website');

  // Twitter card
  setOgTag('twitter:card', 'summary_large_image');
  setOgTag('twitter:title', title || 'StepUp');
  setOgTag('twitter:description', description || 'Premium footwear for every step of your journey.');
  if (image) setOgTag('twitter:image', image);
}

function setOgTag(property: string, content: string) {
  let meta = document.querySelector(`meta[property="${property}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

export function setJsonLd(data: Record<string, any>) {
  let script = document.querySelector('script[type="application/ld+json"]');
  if (!script) {
    script = document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}
