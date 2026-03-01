let lastRequestTime = 0;

async function nominatimSearch(
  query: string
): Promise<{ latitude: number; longitude: number } | null> {
  // Rate limit: 1 request per second (Nominatim policy)
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - timeSinceLast));
  }
  lastRequestTime = Date.now();

  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
    countrycodes: "us",
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        "User-Agent": "LeaseSimple/1.0",
      },
    }
  );

  if (!response.ok) return null;

  const results = await response.json();
  if (results.length === 0) return null;

  return {
    latitude: parseFloat(results[0].lat),
    longitude: parseFloat(results[0].lon),
  };
}

/**
 * Extract a city/state/zip portion from an address string.
 * Tries common patterns like "City, ST 12345" or "City, State".
 */
function extractCityState(address: string): string | null {
  // Try to match "City, ST ZIP" or "City, State ZIP" at the end
  const match = address.match(
    /([A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)\s*$/
  );
  if (match) return match[1].trim();

  // Try "City, ST" or "City, State" at the end
  const match2 = address.match(/([A-Za-z\s]+,\s*[A-Z]{2})\s*$/);
  if (match2) return match2[1].trim();

  // Try "City, Full State Name"
  const match3 = address.match(/([A-Za-z\s]+,\s*[A-Za-z\s]{4,})\s*$/);
  if (match3) return match3[1].trim();

  return null;
}

/**
 * Strip suite/unit/building numbers and property names to get a street address.
 * E.g. "Downtown Office Tower - Suite 1500, 123 Main St" → "123 Main St"
 */
function simplifyAddress(address: string): string {
  // Remove leading property names (text before a dash or colon followed by address-like content)
  let simplified = address.replace(/^[^,\d]*[-:]\s*/i, "");
  // Remove suite/unit/building/floor designators
  simplified = simplified.replace(
    /\s*[-,]?\s*(suite|ste|unit|bldg|building|floor|level|#)\s*\S+/gi,
    ""
  );
  // Clean up extra commas/spaces
  simplified = simplified.replace(/,\s*,/g, ",").replace(/^\s*,\s*/, "").trim();
  return simplified;
}

export async function geocodeAddress(
  address: string
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    // Attempt 1: Full address as-is
    const result1 = await nominatimSearch(address);
    if (result1) return result1;

    // Attempt 2: Simplified address (strip property names, suite numbers)
    const simplified = simplifyAddress(address);
    if (simplified !== address && simplified.length > 5) {
      const result2 = await nominatimSearch(simplified);
      if (result2) return result2;
    }

    // Attempt 3: Just city, state, zip
    const cityState = extractCityState(address);
    if (cityState) {
      const result3 = await nominatimSearch(cityState);
      if (result3) return result3;
    }

    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}
