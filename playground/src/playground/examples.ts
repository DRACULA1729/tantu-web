// Examples gallery data, built by scripts/build-weft-assets.mjs from the language repo's
// examples/*.weft (public/examples/index.json).
export interface Example {
  name: string;
  title: string;
  source: string;
}

export async function loadExamples(): Promise<Example[]> {
  const base = import.meta.env.BASE_URL;
  const url = new URL(base + "examples/index.json", location.href).href;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    return (await res.json()) as Example[];
  } catch {
    return [];
  }
}
