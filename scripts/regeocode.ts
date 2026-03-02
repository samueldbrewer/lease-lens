import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let lastRequestTime = 0;

async function nominatimSearch(
  query: string
): Promise<{ latitude: number; longitude: number } | null> {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < 1100) {
    await new Promise((resolve) => setTimeout(resolve, 1100 - timeSinceLast));
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
    { headers: { "User-Agent": "LeaseSimple/1.0" } }
  );

  if (!response.ok) return null;
  const results = await response.json();
  if (results.length === 0) return null;

  return {
    latitude: parseFloat(results[0].lat),
    longitude: parseFloat(results[0].lon),
  };
}

function simplifyAddress(address: string): string {
  let simplified = address.replace(/^[^,\d]*[-:]\s*/i, "");
  simplified = simplified.replace(
    /\s*[-,]?\s*(suite|ste|unit|bldg|building|floor|level|#)\s*\S+/gi,
    ""
  );
  simplified = simplified
    .replace(/,\s*,/g, ",")
    .replace(/^\s*,\s*/, "")
    .trim();
  return simplified;
}

function extractCityState(address: string): string | null {
  const match = address.match(
    /([A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)\s*$/
  );
  if (match) return match[1].trim();
  const match2 = address.match(/([A-Za-z\s]+,\s*[A-Z]{2})\s*$/);
  if (match2) return match2[1].trim();
  return null;
}

async function geocodeAddress(
  address: string
): Promise<{ latitude: number; longitude: number } | null> {
  const result1 = await nominatimSearch(address);
  if (result1) return result1;

  const simplified = simplifyAddress(address);
  if (simplified !== address && simplified.length > 5) {
    const result2 = await nominatimSearch(simplified);
    if (result2) return result2;
  }

  const cityState = extractCityState(address);
  if (cityState) {
    const result3 = await nominatimSearch(cityState);
    if (result3) return result3;
  }

  return null;
}

async function main() {
  const terms = await prisma.leaseTerms.findMany({
    where: {
      propertyAddress: { not: null },
      latitude: null,
    },
    select: {
      id: true,
      propertyAddress: true,
      document: { select: { filename: true } },
    },
  });

  console.log(`Found ${terms.length} lease terms missing coordinates\n`);

  for (const term of terms) {
    if (!term.propertyAddress) continue;
    console.log(`Geocoding: ${term.document.filename}`);
    console.log(`  Address: ${term.propertyAddress}`);

    const coords = await geocodeAddress(term.propertyAddress);
    if (coords) {
      await prisma.leaseTerms.update({
        where: { id: term.id },
        data: { latitude: coords.latitude, longitude: coords.longitude },
      });
      console.log(`  -> ${coords.latitude}, ${coords.longitude}\n`);
    } else {
      console.log(`  -> FAILED to geocode\n`);
    }
  }

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
