import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create test user
  const passwordHash = await bcrypt.hash("TestPass123!", 12);
  const user = await prisma.user.upsert({
    where: { email: "test@leaselens.com" },
    update: {},
    create: {
      email: "test@leaselens.com",
      passwordHash,
      name: "Test User",
    },
  });

  console.log(`Created test user: ${user.email} (id: ${user.id})`);

  // 10 fake leases with dramatically different terms
  const leases = [
    {
      filename: "Downtown Office Tower - Suite 1500.pdf",
      terms: {
        propertyAddress: "100 Financial Center, Suite 1500, New York, NY 10005",
        tenantName: "Apex Capital Partners LLC",
        landlordName: "Brookfield Manhattan Holdings",
        leaseStart: new Date("2024-01-01"),
        leaseEnd: new Date("2034-12-31"),
        monthlyRent: 87500,
        securityDeposit: 525000,
        leaseType: "NNN",
        squareFootage: 25000,
        permittedUse: "General office, financial services, trading operations",
        renewalOptions: "Two 5-year renewal options at 95% of then-prevailing market rate",
        terminationClauses: "Early termination permitted after Year 5 with 12-month notice and payment of 6 months unamortized TI costs",
        maintenanceObligations: { tenant: ["Interior buildout", "HVAC filters", "Janitorial"], landlord: ["Structural elements", "Roof", "Common areas", "Elevators"] },
        insuranceRequirements: { types: ["Commercial General Liability", "Property", "Workers Comp", "Umbrella"], minimumCoverage: "$5,000,000" },
        taxObligations: "Tenant pays pro-rata share of real estate tax increases over 2023 base year",
        camCharges: "$18.50/SF annually, capped at 5% annual increase",
        escalationClauses: "3% annual fixed escalation on base rent",
        keyProvisions: ["Exclusive elevator bank access", "Rooftop antenna rights", "24/7 HVAC", "Signage rights on building directory"],
        summary: "Premium Class A office lease in NYC Financial District. Long-term 10-year NNN lease with substantial monthly rent and strong tenant improvement allowance. Favorable renewal options for tenant.",
      },
    },
    {
      filename: "Suburban Strip Mall - Unit 4B.pdf",
      terms: {
        propertyAddress: "2847 Riverside Drive, Unit 4B, Plano, TX 75023",
        tenantName: "Happy Nails Salon & Spa",
        landlordName: "Sun Prairie Retail Partners",
        leaseStart: new Date("2025-06-01"),
        leaseEnd: new Date("2028-05-31"),
        monthlyRent: 2800,
        securityDeposit: 5600,
        leaseType: "Gross",
        squareFootage: 1400,
        permittedUse: "Nail salon, spa services, retail sale of beauty products",
        renewalOptions: "One 3-year renewal option at market rate with 90-day notice",
        terminationClauses: "No early termination permitted. Tenant liable for balance of rent upon default.",
        maintenanceObligations: { tenant: ["Interior maintenance", "Plumbing within unit", "Signage"], landlord: ["Roof", "Parking lot", "Exterior walls", "HVAC system"] },
        insuranceRequirements: { types: ["General Liability", "Property"], minimumCoverage: "$1,000,000" },
        taxObligations: "Included in gross rent",
        camCharges: "Included in gross rent",
        escalationClauses: "Fixed rent for term; renewal at market rate",
        keyProvisions: ["Exclusive use clause for nail services within shopping center", "Permitted signage on storefront", "5 reserved parking spaces"],
        summary: "Small retail lease in suburban strip mall. Short 3-year gross lease with low rent and minimal tenant obligations. Simple terms suitable for a small business.",
      },
    },
    {
      filename: "Industrial Warehouse - Building C.pdf",
      terms: {
        propertyAddress: "8901 Commerce Park Way, Building C, Indianapolis, IN 46241",
        tenantName: "MidWest Logistics Corp",
        landlordName: "Prologis Industrial Trust",
        leaseStart: new Date("2023-03-01"),
        leaseEnd: new Date("2030-02-28"),
        monthlyRent: 42000,
        securityDeposit: 84000,
        leaseType: "NNN",
        squareFootage: 60000,
        permittedUse: "Warehousing, distribution, light manufacturing, truck terminal operations",
        renewalOptions: "Three 5-year renewal options at fair market value",
        terminationClauses: "Tenant may terminate after Year 3 with payment of 9 months rent as penalty plus unamortized build-out costs",
        maintenanceObligations: { tenant: ["Interior maintenance", "Loading docks", "Parking lot repairs", "HVAC maintenance"], landlord: ["Structural elements", "Foundation", "Roof replacement (not repair)"] },
        insuranceRequirements: { types: ["General Liability", "Property", "Environmental", "Workers Comp"], minimumCoverage: "$10,000,000" },
        taxObligations: "Tenant responsible for 100% of real estate taxes",
        camCharges: "$2.75/SF annually for common area maintenance",
        escalationClauses: "CPI-based annual increases, minimum 2%, maximum 4%",
        keyProvisions: ["40-foot clear height", "12 dock-high doors", "2 drive-in doors", "ESFR sprinkler system", "Truck court depth 130 feet"],
        summary: "Large industrial warehouse lease with distribution capabilities. 7-year NNN term with CPI escalation and multiple renewal options. Located in major logistics corridor near I-70/I-65 interchange.",
      },
    },
    {
      filename: "Medical Office - Dr. Chen Practice.pdf",
      terms: {
        propertyAddress: "456 Wellness Boulevard, Suite 200, Scottsdale, AZ 85251",
        tenantName: "Chen Family Medicine PLLC",
        landlordName: "Healthcare Realty Trust",
        leaseStart: new Date("2024-09-01"),
        leaseEnd: new Date("2031-08-31"),
        monthlyRent: 14500,
        securityDeposit: 43500,
        leaseType: "Modified Gross",
        squareFootage: 3800,
        permittedUse: "Medical office, family medicine practice, outpatient services, minor procedures",
        renewalOptions: "Two 5-year renewal options at 90% of fair market value",
        terminationClauses: "No early termination. Assignment permitted only to another licensed medical practitioner with landlord consent.",
        maintenanceObligations: { tenant: ["Medical equipment", "Interior finishes", "Specialized plumbing", "Medical waste disposal"], landlord: ["HVAC", "Electrical systems", "Elevator", "Common areas", "Parking"] },
        insuranceRequirements: { types: ["General Liability", "Professional Liability/Malpractice", "Property", "Workers Comp"], minimumCoverage: "$3,000,000" },
        taxObligations: "Tenant pays pro-rata share of tax increases above 2024 base year assessment",
        camCharges: "$8.25/SF, including janitorial for common areas",
        escalationClauses: "2.5% annual fixed escalation",
        keyProvisions: ["Medical gas infrastructure", "Backup generator access", "After-hours HVAC available at $45/hour", "ADA compliant buildout", "Dedicated patient parking"],
        summary: "Medical office lease in purpose-built healthcare facility. 7-year modified gross lease with favorable renewal terms. Includes specialized medical infrastructure and dedicated parking.",
      },
    },
    {
      filename: "Restaurant Space - The Rustic Table.pdf",
      terms: {
        propertyAddress: "1200 Main Street, Ground Floor, Charleston, SC 29401",
        tenantName: "The Rustic Table LLC",
        landlordName: "Historic Charleston Properties",
        leaseStart: new Date("2025-01-15"),
        leaseEnd: new Date("2035-01-14"),
        monthlyRent: 9200,
        securityDeposit: 55200,
        leaseType: "NNN",
        squareFootage: 2800,
        permittedUse: "Full-service restaurant, bar, catering preparation, outdoor dining on approved patio area",
        renewalOptions: "One 10-year renewal option at fair market value with 180-day notice required",
        terminationClauses: "Landlord may terminate if restaurant ceases operations for more than 90 consecutive days. No tenant early termination right.",
        maintenanceObligations: { tenant: ["Kitchen equipment", "Grease traps", "Hood/exhaust systems", "Interior buildout", "Pest control", "Patio maintenance"], landlord: ["Structural", "Roof", "Exterior facade (historic preservation requirements)"] },
        insuranceRequirements: { types: ["General Liability", "Liquor Liability", "Property", "Workers Comp", "Food Contamination"], minimumCoverage: "$2,000,000" },
        taxObligations: "Tenant pays 100% of real estate taxes directly",
        camCharges: "N/A - standalone ground floor unit",
        escalationClauses: "Percentage rent: 6% of gross sales exceeding $1,200,000 annually, in addition to base rent",
        keyProvisions: ["Liquor license transfer assistance", "Outdoor dining permit included", "Historic facade maintenance by landlord", "Grease trap upgrade at tenant cost", "Kitchen exhaust venting rights"],
        summary: "Restaurant lease in historic downtown Charleston. 10-year NNN lease with percentage rent clause tied to gross sales. High security deposit (6 months). Includes outdoor dining and liquor license provisions.",
      },
    },
    {
      filename: "Tech Startup Flex Space - Level 3.pdf",
      terms: {
        propertyAddress: "700 Innovation Drive, Level 3, Austin, TX 78701",
        tenantName: "NeuralPath AI Inc",
        landlordName: "Capital Factory Real Estate",
        leaseStart: new Date("2025-03-01"),
        leaseEnd: new Date("2027-02-28"),
        monthlyRent: 18000,
        securityDeposit: 36000,
        leaseType: "Gross",
        squareFootage: 4500,
        permittedUse: "Technology office, software development, data processing, server room operations",
        renewalOptions: "Month-to-month holdover at 110% of final rent after initial term. 60-day notice to vacate.",
        terminationClauses: "Either party may terminate with 90-day written notice after first 12 months",
        maintenanceObligations: { tenant: ["Interior furnishings", "IT infrastructure", "Server room cooling"], landlord: ["Everything else including HVAC, janitorial, utilities"] },
        insuranceRequirements: { types: ["General Liability", "Cyber Liability", "Property"], minimumCoverage: "$2,000,000" },
        taxObligations: "Included in gross rent",
        camCharges: "Included in gross rent",
        escalationClauses: "None during initial 2-year term",
        keyProvisions: ["100Gbps fiber connectivity included", "Dedicated server room with supplemental cooling", "Shared conference rooms", "Bike storage", "Dog-friendly policy"],
        summary: "Short-term flex office lease for tech startup. 2-year gross lease with easy exit provisions after Year 1. All-inclusive rent with premium connectivity and modern amenities.",
      },
    },
    {
      filename: "Anchor Retail - Big Box Store.pdf",
      terms: {
        propertyAddress: "5500 Gateway Boulevard, Pad A, Jacksonville, FL 32218",
        tenantName: "HomeMax Superstore Inc",
        landlordName: "Regency Centers Corporation",
        leaseStart: new Date("2020-08-01"),
        leaseEnd: new Date("2040-07-31"),
        monthlyRent: 125000,
        securityDeposit: 0,
        leaseType: "NNN",
        squareFootage: 95000,
        permittedUse: "Home improvement retail, garden center, lumber yard, tool rental, installation services",
        renewalOptions: "Four 5-year renewal options at the lesser of CPI-adjusted rent or 95% of fair market value",
        terminationClauses: "Tenant may terminate after Year 10 if co-tenancy clause is violated (requires minimum 70% center occupancy). No other early termination.",
        maintenanceObligations: { tenant: ["Entire premises including roof, structure, parking, landscaping, HVAC replacement"], landlord: ["None - absolute NNN lease"] },
        insuranceRequirements: { types: ["General Liability", "Property", "Workers Comp", "Umbrella", "Environmental"], minimumCoverage: "$25,000,000" },
        taxObligations: "Tenant pays 100% of real estate taxes directly to taxing authority",
        camCharges: "N/A - tenant maintains own premises. Contributes $0.50/SF to shopping center marketing fund.",
        escalationClauses: "Fixed 10% increase every 5 years (not compounding)",
        keyProvisions: ["Co-tenancy clause requiring 70% center occupancy", "Exclusive use for home improvement within 3-mile radius", "Signage rights on pylon and building", "Drive-through lumber yard", "Garden center outdoor display area"],
        summary: "Major anchor tenant lease for big-box home improvement retailer. 20-year absolute NNN lease with zero security deposit. Tenant responsible for all maintenance including structure. Strong co-tenancy and exclusive use protections.",
      },
    },
    {
      filename: "Ground Lease - Gas Station Parcel.pdf",
      terms: {
        propertyAddress: "12100 Interstate Highway 35, Parcel 7, San Marcos, TX 78666",
        tenantName: "PetroStar Convenience LLC",
        landlordName: "Highway Land Holdings LP",
        leaseStart: new Date("2019-01-01"),
        leaseEnd: new Date("2068-12-31"),
        monthlyRent: 8500,
        securityDeposit: 25000,
        leaseType: "Ground Lease",
        squareFootage: 3200,
        permittedUse: "Gasoline/diesel fueling station, convenience store, car wash, EV charging stations",
        renewalOptions: "Two 10-year renewal options at fair market ground rent",
        terminationClauses: "Landlord may terminate for environmental contamination exceeding $500,000 in remediation costs. Tenant may terminate with 24-month notice after Year 25.",
        maintenanceObligations: { tenant: ["All improvements including buildings, canopy, fuel systems, paving, landscaping, signage, environmental compliance"], landlord: ["None - ground lease"] },
        insuranceRequirements: { types: ["General Liability", "Property", "Environmental/Pollution Liability", "UST Liability", "Workers Comp"], minimumCoverage: "$10,000,000" },
        taxObligations: "Tenant pays all real estate taxes on land and improvements",
        camCharges: "N/A - ground lease",
        escalationClauses: "CPI adjustment every 5 years, minimum 10% increase per adjustment period, maximum 25%",
        keyProvisions: ["50-year initial term", "Tenant owns all improvements", "Improvements revert to landlord at lease end", "Environmental indemnification by tenant", "Right to install EV charging infrastructure"],
        summary: "Ultra-long-term 50-year ground lease for gas station and convenience store. Tenant owns and maintains all improvements which revert to landlord at expiration. Low monthly land rent with CPI adjustments every 5 years.",
      },
    },
    {
      filename: "Coworking Sublease - WeSpace Floor 12.pdf",
      terms: {
        propertyAddress: "350 Market Street, Floor 12, San Francisco, CA 94105",
        tenantName: "DataVault Solutions (Subtenant)",
        landlordName: "WeSpace Inc (Sublandlord / Master Tenant)",
        leaseStart: new Date("2025-04-01"),
        leaseEnd: new Date("2026-03-31"),
        monthlyRent: 32000,
        securityDeposit: 64000,
        leaseType: "Gross",
        squareFootage: 5200,
        permittedUse: "General office use consistent with master lease terms. No cooking, no hazardous materials.",
        renewalOptions: "No renewal option. Sublease expires with or before master lease. Month-to-month holdover at 150% of rent if master lease permits.",
        terminationClauses: "Either party may terminate with 30-day notice. Sublease automatically terminates if master lease is terminated for any reason.",
        maintenanceObligations: { tenant: ["Keep space in good condition", "Remove all personal property at expiration"], landlord: ["Furniture included", "IT infrastructure", "Cleaning", "HVAC", "All building services per master lease"] },
        insuranceRequirements: { types: ["General Liability", "Property (contents only)"], minimumCoverage: "$1,000,000" },
        taxObligations: "Included in gross rent",
        camCharges: "Included in gross rent. Access to shared kitchens, lounges, phone booths, and meeting rooms.",
        escalationClauses: "None for 12-month term",
        keyProvisions: ["Fully furnished", "30-day termination clause", "Shared amenities", "Master lease subordination", "No alterations without written consent", "24/7 building access"],
        summary: "Short-term furnished sublease in San Francisco coworking space. 12-month gross lease with 30-day exit clause. High rent per SF reflects furnished space and premium SOMA location. Subject to master lease terms.",
      },
    },
    {
      filename: "Agricultural Land Lease - Valley Farm.pdf",
      terms: {
        propertyAddress: "Rural Route 4, Sections 12-14, Valley Township, Fresno County, CA 93706",
        tenantName: "Central Valley Organics LLC",
        landlordName: "Hernandez Family Trust",
        leaseStart: new Date("2024-01-01"),
        leaseEnd: new Date("2028-12-31"),
        monthlyRent: 6250,
        securityDeposit: 12500,
        leaseType: "Gross",
        squareFootage: 0,
        permittedUse: "Organic farming, crop cultivation, agricultural processing and storage. No livestock.",
        renewalOptions: "Automatic renewal for successive 5-year terms unless either party gives 12-month notice of non-renewal",
        terminationClauses: "Landlord may terminate for failure to maintain organic certification. Tenant may terminate after crop failure in 2 consecutive seasons with 6-month notice.",
        maintenanceObligations: { tenant: ["Irrigation systems", "Soil conservation", "Fencing", "Access roads", "Organic certification maintenance"], landlord: ["Well pump replacement", "Primary water infrastructure", "Property tax payment"] },
        insuranceRequirements: { types: ["General Liability", "Crop Insurance", "Workers Comp"], minimumCoverage: "$2,000,000" },
        taxObligations: "Paid by landlord; factored into rent calculation",
        camCharges: "N/A",
        escalationClauses: "Rent adjusted every 2 years based on USDA farmland rental survey for Fresno County, minimum $6,000/month",
        keyProvisions: ["480 acres total", "Senior water rights included", "Organic certification must be maintained", "Right of first refusal if land is sold", "Crop rotation plan required annually"],
        summary: "Agricultural land lease for 480 acres of certified organic farmland in California's Central Valley. 5-year term with automatic renewal. Rent tied to USDA farmland surveys. Includes senior water rights, critical for California agriculture.",
      },
    },
  ];

  for (const lease of leases) {
    // Check if document already exists for this user
    const existing = await prisma.document.findFirst({
      where: { filename: lease.filename, userId: user.id },
    });
    if (existing) {
      console.log(`  Skipping (exists): ${lease.filename}`);
      continue;
    }

    // Build fake original text from the terms
    const originalText = buildFakeLeaseText(lease);

    const document = await prisma.document.create({
      data: {
        filename: lease.filename,
        originalText,
        pageCount: Math.floor(Math.random() * 30) + 10,
        status: "ready",
        userId: user.id,
      },
    });

    // Create lease terms
    await prisma.leaseTerms.create({
      data: {
        documentId: document.id,
        ...lease.terms,
        maintenanceObligations: lease.terms.maintenanceObligations as object,
        insuranceRequirements: lease.terms.insuranceRequirements as object,
        keyProvisions: lease.terms.keyProvisions,
      },
    });

    // Create a few document chunks from the fake text
    const chunks = splitIntoChunks(originalText);
    await prisma.documentChunk.createMany({
      data: chunks.map((content, i) => ({
        documentId: document.id,
        chunkIndex: i,
        content,
        section: detectSection(content),
      })),
    });

    console.log(`  Created: ${lease.filename}`);
  }

  console.log("\n--- Test Credentials ---");
  console.log("Email: test@leaselens.com");
  console.log("Password: TestPass123!");
  console.log("------------------------");
}

function buildFakeLeaseText(lease: { filename: string; terms: Record<string, unknown> }): string {
  const t = lease.terms as Record<string, string | number | Date | string[] | null | object>;
  let text = `COMMERCIAL LEASE AGREEMENT\n\n`;
  text += `This Lease Agreement ("Lease") is entered into as of ${t.leaseStart instanceof Date ? t.leaseStart.toLocaleDateString() : t.leaseStart}.\n\n`;
  text += `LANDLORD: ${t.landlordName}\n`;
  text += `TENANT: ${t.tenantName}\n\n`;
  text += `ARTICLE 1 - PREMISES\nThe Landlord hereby leases to the Tenant the premises located at ${t.propertyAddress}`;
  if (t.squareFootage && Number(t.squareFootage) > 0) text += `, comprising approximately ${Number(t.squareFootage).toLocaleString()} square feet of ${String(t.leaseType)} space`;
  text += `.\n\n`;
  text += `ARTICLE 2 - TERM\nThe lease term shall commence on ${t.leaseStart instanceof Date ? t.leaseStart.toLocaleDateString() : t.leaseStart} and expire on ${t.leaseEnd instanceof Date ? t.leaseEnd.toLocaleDateString() : t.leaseEnd}.\n\n`;
  text += `ARTICLE 3 - RENT\nBase monthly rent shall be $${Number(t.monthlyRent).toLocaleString()} per month. `;
  if (t.securityDeposit) text += `Security deposit of $${Number(t.securityDeposit).toLocaleString()} is required. `;
  if (t.escalationClauses) text += `Escalation: ${t.escalationClauses}`;
  text += `\n\n`;
  text += `ARTICLE 4 - PERMITTED USE\n${t.permittedUse}\n\n`;
  text += `ARTICLE 5 - LEASE TYPE\nThis is a ${t.leaseType} lease. `;
  if (t.camCharges) text += `CAM charges: ${t.camCharges}. `;
  if (t.taxObligations) text += `Tax obligations: ${t.taxObligations}`;
  text += `\n\n`;
  text += `ARTICLE 6 - RENEWAL OPTIONS\n${t.renewalOptions}\n\n`;
  text += `ARTICLE 7 - TERMINATION\n${t.terminationClauses}\n\n`;
  text += `ARTICLE 8 - MAINTENANCE\n`;
  const maint = t.maintenanceObligations as { tenant?: string[]; landlord?: string[] } | null;
  if (maint) {
    if (maint.tenant) text += `Tenant responsibilities: ${maint.tenant.join(", ")}. `;
    if (maint.landlord) text += `Landlord responsibilities: ${maint.landlord.join(", ")}.`;
  }
  text += `\n\n`;
  text += `ARTICLE 9 - INSURANCE\n`;
  const ins = t.insuranceRequirements as { types?: string[]; minimumCoverage?: string } | null;
  if (ins) {
    if (ins.types) text += `Required coverages: ${ins.types.join(", ")}. `;
    if (ins.minimumCoverage) text += `Minimum coverage: ${ins.minimumCoverage}.`;
  }
  text += `\n\n`;
  const kp = t.keyProvisions as string[] | null;
  if (kp && kp.length > 0) {
    text += `ARTICLE 10 - KEY PROVISIONS\n`;
    kp.forEach((p, i) => { text += `${i + 1}. ${p}\n`; });
    text += `\n`;
  }
  if (t.summary) text += `SUMMARY\n${t.summary}\n`;
  return text;
}

function splitIntoChunks(text: string, size = 1200): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const lastNewline = text.lastIndexOf("\n", end);
      if (lastNewline > start) end = lastNewline + 1;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

function detectSection(content: string): string | null {
  const lower = content.toLowerCase();
  if (lower.includes("article 3") || lower.includes("rent")) return "Rent";
  if (lower.includes("article 2") || lower.includes("term")) return "Term";
  if (lower.includes("article 4") || lower.includes("permitted use")) return "Permitted Use";
  if (lower.includes("article 6") || lower.includes("renewal")) return "Renewal";
  if (lower.includes("article 7") || lower.includes("termination")) return "Termination";
  if (lower.includes("article 8") || lower.includes("maintenance")) return "Maintenance";
  if (lower.includes("article 9") || lower.includes("insurance")) return "Insurance";
  if (lower.includes("article 1") || lower.includes("premises")) return "Premises";
  return null;
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
