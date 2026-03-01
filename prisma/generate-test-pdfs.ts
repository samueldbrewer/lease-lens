import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = path.join(__dirname, "test-pdfs");

interface LeaseData {
  filename: string;
  landlord: string;
  tenant: string;
  address: string;
  sqft: number;
  leaseType: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  permittedUse: string;
  renewalOptions: string;
  terminationClauses: string;
  tenantMaintenance: string[];
  landlordMaintenance: string[];
  insuranceTypes: string[];
  minimumCoverage: string;
  taxObligations: string;
  camCharges: string;
  escalationClauses: string;
  keyProvisions: string[];
  additionalClauses: string[];
}

const leases: LeaseData[] = [
  {
    filename: "Downtown Office Tower - Suite 1500.pdf",
    landlord: "Brookfield Manhattan Holdings",
    tenant: "Apex Capital Partners LLC",
    address: "100 Financial Center, Suite 1500, New York, NY 10005",
    sqft: 25000,
    leaseType: "Triple Net (NNN)",
    startDate: "January 1, 2024",
    endDate: "December 31, 2034",
    monthlyRent: 87500,
    securityDeposit: 525000,
    permittedUse: "General office, financial services, trading operations",
    renewalOptions: "Two (2) five-year renewal options at 95% of then-prevailing market rate. Tenant must provide written notice of intent to renew no later than twelve (12) months prior to the expiration of the then-current term.",
    terminationClauses: "Early termination permitted after Year 5 with twelve (12) months prior written notice and payment of six (6) months unamortized tenant improvement costs. Landlord may terminate upon material default that remains uncured for thirty (30) days following written notice.",
    tenantMaintenance: ["Interior buildout and finish", "HVAC filters and preventive maintenance within premises", "Janitorial services for the premises", "All personal property and trade fixtures"],
    landlordMaintenance: ["Structural elements including foundation, exterior walls, and load-bearing components", "Roof and roof membrane", "Common areas including lobbies, corridors, and restrooms", "Elevators and escalators", "Base building HVAC, electrical, and plumbing systems"],
    insuranceTypes: ["Commercial General Liability ($5,000,000 per occurrence)", "Property Insurance (replacement cost)", "Workers Compensation (statutory limits)", "Umbrella/Excess Liability ($5,000,000)"],
    minimumCoverage: "$5,000,000",
    taxObligations: "Tenant shall pay its pro-rata share (as defined in Exhibit B) of real estate tax increases over the 2023 base year assessment. Pro-rata share is calculated as 8.33% based on 25,000 rentable square feet of a 300,000 square foot building.",
    camCharges: "$18.50 per square foot annually, subject to a 5% annual cap on increases. CAM charges include building management, landscaping, parking lot maintenance, and common area utilities.",
    escalationClauses: "Base rent shall increase by 3% annually on each anniversary of the Commencement Date. In no event shall the annual base rent be less than the prior year's base rent.",
    keyProvisions: [
      "Tenant shall have exclusive access to a dedicated elevator bank serving floors 14-16.",
      "Tenant is granted the right to install up to two (2) rooftop antennas or satellite dishes, subject to Landlord's reasonable approval of size and placement.",
      "Landlord shall provide HVAC service to the premises 24 hours per day, 7 days per week, at no additional charge beyond base rent and operating expenses.",
      "Tenant shall have the right to be listed on the building directory in the main lobby and on any monument signage.",
      "Landlord provides tenant improvement allowance of $85.00 per square foot ($2,125,000 total).",
    ],
    additionalClauses: [
      "ARTICLE 11 - ASSIGNMENT AND SUBLETTING\nTenant may not assign this Lease or sublet the premises or any portion thereof without the prior written consent of Landlord, which consent shall not be unreasonably withheld, conditioned, or delayed. Notwithstanding the foregoing, Tenant may assign this Lease or sublet the premises to an affiliate or successor entity without Landlord's consent, provided that the assignee or subtenant has a net worth equal to or greater than Tenant's net worth as of the date of this Lease.",
      "ARTICLE 12 - ESTOPPEL CERTIFICATES\nEach party agrees, at any time and from time to time, upon not less than fifteen (15) days prior written request by the other party, to execute, acknowledge, and deliver to the requesting party a statement in writing certifying that this Lease is unmodified and in full force and effect, the dates to which rent and other charges have been paid, and whether or not there are any defaults existing under this Lease.",
      "ARTICLE 13 - SUBORDINATION\nThis Lease shall be subject and subordinate to all ground leases, mortgages, deeds of trust, and other encumbrances now or hereafter affecting the Building or the land upon which it is situated. Tenant agrees to execute and deliver any instruments confirming such subordination as Landlord may reasonably request.",
      "ARTICLE 14 - QUIET ENJOYMENT\nLandlord covenants that Tenant, upon paying the rent and performing all of its obligations under this Lease, shall peaceably and quietly have, hold, and enjoy the premises for the Term without hindrance or molestation by Landlord or any person claiming by, through, or under Landlord.",
    ],
  },
  {
    filename: "Suburban Strip Mall - Unit 4B.pdf",
    landlord: "Sun Prairie Retail Partners",
    tenant: "Happy Nails Salon & Spa",
    address: "2847 Riverside Drive, Unit 4B, Plano, TX 75023",
    sqft: 1400,
    leaseType: "Gross",
    startDate: "June 1, 2025",
    endDate: "May 31, 2028",
    monthlyRent: 2800,
    securityDeposit: 5600,
    permittedUse: "Nail salon, spa services, and retail sale of beauty products. Tenant shall not use the premises for any other purpose without Landlord's prior written consent.",
    renewalOptions: "One (1) three-year renewal option at the then-prevailing market rate for comparable retail space in the Plano, Texas area. Tenant must provide written notice of intent to renew no later than ninety (90) days prior to expiration.",
    terminationClauses: "No early termination permitted. Upon default, Tenant shall be liable for the balance of rent due for the remainder of the lease term. Landlord may pursue all remedies available at law or in equity.",
    tenantMaintenance: ["Interior maintenance and repairs", "Plumbing fixtures and drains within the premises", "Storefront signage maintenance", "Interior painting and floor coverings"],
    landlordMaintenance: ["Roof repairs and replacement", "Parking lot maintenance and resurfacing", "Exterior walls and structural elements", "HVAC system maintenance and replacement", "Common area landscaping"],
    insuranceTypes: ["General Liability ($1,000,000 per occurrence)", "Property Insurance (contents only)"],
    minimumCoverage: "$1,000,000",
    taxObligations: "Real estate taxes are included in the gross rent. Landlord shall be solely responsible for payment of all real estate taxes and assessments.",
    camCharges: "Common area maintenance charges are included in the gross rent. Tenant shall have no additional CAM obligations.",
    escalationClauses: "Rent shall remain fixed for the initial three-year term at $2,800 per month. Upon renewal, rent shall be adjusted to market rate.",
    keyProvisions: [
      "Tenant is granted an exclusive use clause for nail salon and spa services within the shopping center. No other tenant within the center may operate a nail salon or similar personal care service.",
      "Tenant may install storefront signage not to exceed 24 square feet, subject to Landlord's approval and local sign ordinances.",
      "Tenant is allocated five (5) reserved parking spaces directly in front of Unit 4B.",
      "Operating hours shall be consistent with the shopping center's posted hours unless otherwise approved by Landlord.",
    ],
    additionalClauses: [
      "ARTICLE 11 - UTILITIES\nLandlord shall provide water and sewer service to the premises. Tenant shall be responsible for electricity, gas, telephone, internet, and cable television service. Tenant shall contract directly with utility providers for such services.",
      "ARTICLE 12 - HAZARDOUS MATERIALS\nTenant shall not store, use, or dispose of any hazardous materials on the premises except for standard beauty salon chemicals in quantities reasonably necessary for Tenant's business operations. Tenant shall comply with all applicable environmental laws and regulations.",
    ],
  },
  {
    filename: "Industrial Warehouse - Building C.pdf",
    landlord: "Prologis Industrial Trust",
    tenant: "MidWest Logistics Corp",
    address: "8901 Commerce Park Way, Building C, Indianapolis, IN 46241",
    sqft: 60000,
    leaseType: "Triple Net (NNN)",
    startDate: "March 1, 2023",
    endDate: "February 28, 2030",
    monthlyRent: 42000,
    securityDeposit: 84000,
    permittedUse: "Warehousing, distribution, light manufacturing, and truck terminal operations. No hazardous materials storage except as permitted by applicable law and with Landlord's prior written consent.",
    renewalOptions: "Three (3) five-year renewal options at fair market value as determined by a mutually agreed-upon commercial real estate appraiser. Tenant must provide notice of intent to renew no later than one hundred eighty (180) days prior to expiration of the then-current term.",
    terminationClauses: "Tenant may terminate after Year 3 upon payment of nine (9) months base rent as a termination penalty plus all unamortized build-out costs. Such termination shall require not less than one hundred eighty (180) days prior written notice.",
    tenantMaintenance: ["Interior maintenance and repairs", "Loading dock equipment and levelers", "Parking lot repairs and striping (not resurfacing)", "HVAC preventive maintenance and filter replacement", "Fire sprinkler system inspection and maintenance", "Pest control"],
    landlordMaintenance: ["Structural elements including columns, beams, and foundation", "Foundation and slab repair (not surface coatings)", "Roof replacement (tenant responsible for routine repairs up to $5,000 per incident)"],
    insuranceTypes: ["General Liability ($10,000,000 per occurrence)", "Property Insurance (replacement cost)", "Environmental/Pollution Liability ($5,000,000)", "Workers Compensation (statutory limits)"],
    minimumCoverage: "$10,000,000",
    taxObligations: "Tenant shall be responsible for one hundred percent (100%) of all real estate taxes, assessments, and governmental charges levied against the premises. Tenant shall pay such taxes directly to the taxing authority upon receipt of the tax bill from Landlord.",
    camCharges: "$2.75 per square foot annually for common area maintenance including shared roads, drainage, and perimeter landscaping. CAM charges are subject to annual reconciliation.",
    escalationClauses: "Annual rent increases based on the Consumer Price Index (CPI-U, U.S. City Average), with a minimum annual increase of 2% and a maximum of 4%. Adjustments are effective on March 1 of each year.",
    keyProvisions: [
      "Building features 40-foot clear ceiling height throughout the warehouse area.",
      "Twelve (12) dock-high loading doors with hydraulic levelers and dock shelters.",
      "Two (2) drive-in doors measuring 14 feet wide by 16 feet high.",
      "ESFR (Early Suppression Fast Response) sprinkler system installed throughout.",
      "Truck court depth of 130 feet with dedicated trailer parking for up to 40 trailers.",
      "The premises are located within 2 miles of the I-70/I-65 interchange, providing excellent interstate access.",
    ],
    additionalClauses: [
      "ARTICLE 11 - ENVIRONMENTAL\nTenant shall not cause or permit any environmental contamination of the premises or surrounding property. Tenant shall indemnify and hold harmless Landlord from any environmental claims arising from Tenant's use of the premises. Prior to lease execution, Landlord has provided a Phase I Environmental Site Assessment dated September 2022 showing no recognized environmental conditions.",
      "ARTICLE 12 - SIGNAGE\nTenant may install building identification signage on the front facade and one monument sign at the entrance from Commerce Park Way. All signage shall comply with the Commerce Park design guidelines and local ordinances.",
      "ARTICLE 13 - EXPANSION RIGHTS\nTenant shall have a right of first offer on Building D (adjacent, approximately 40,000 SF) if it becomes available during the term of this Lease. Landlord shall provide Tenant with written notice and proposed terms, and Tenant shall have thirty (30) days to accept or decline.",
    ],
  },
  {
    filename: "Medical Office - Dr. Chen Practice.pdf",
    landlord: "Healthcare Realty Trust",
    tenant: "Chen Family Medicine PLLC",
    address: "456 Wellness Boulevard, Suite 200, Scottsdale, AZ 85251",
    sqft: 3800,
    leaseType: "Modified Gross",
    startDate: "September 1, 2024",
    endDate: "August 31, 2031",
    monthlyRent: 14500,
    securityDeposit: 43500,
    permittedUse: "Medical office, family medicine practice, outpatient services, and minor procedures. Tenant must maintain all required medical licenses and certifications throughout the lease term.",
    renewalOptions: "Two (2) five-year renewal options at 90% of fair market value for comparable medical office space in the Scottsdale area. Tenant must provide written notice of intent to renew at least one hundred twenty (120) days prior to the expiration of the then-current term.",
    terminationClauses: "No early termination permitted. Assignment is permitted only to another licensed medical practitioner with Landlord's prior written consent, which shall not be unreasonably withheld. Upon any assignment, Tenant shall remain liable for all obligations under this Lease.",
    tenantMaintenance: ["All medical equipment and specialized fixtures", "Interior finishes including paint, flooring, and ceiling tiles", "Specialized medical plumbing (sterilization equipment, lab sinks)", "Medical waste disposal and compliance with all applicable regulations", "Interior signage and wayfinding within the premises"],
    landlordMaintenance: ["HVAC systems including makeup air units", "Base building electrical systems and panels", "Elevator maintenance and inspection", "Common areas including corridors, restrooms, and waiting areas", "Parking lot maintenance, lighting, and security"],
    insuranceTypes: ["General Liability ($3,000,000 per occurrence)", "Professional Liability/Malpractice ($3,000,000 per occurrence)", "Property Insurance (replacement cost for tenant improvements)", "Workers Compensation (statutory limits)"],
    minimumCoverage: "$3,000,000",
    taxObligations: "Tenant shall pay its pro-rata share of real estate tax increases above the 2024 base year assessment. Tenant's pro-rata share is 15.83% based on 3,800 square feet of a 24,000 square foot building.",
    camCharges: "$8.25 per square foot annually, including janitorial services for common areas. CAM charges include elevator maintenance, common area HVAC, landscaping, and parking lot maintenance.",
    escalationClauses: "Base rent shall increase by 2.5% annually on each anniversary of the Commencement Date. This fixed escalation applies throughout the initial term and any renewal terms.",
    keyProvisions: [
      "Landlord has installed medical gas infrastructure (oxygen and suction) to the premises at Landlord's expense.",
      "Tenant shall have access to the building's backup generator for critical medical equipment. Generator capacity allocated to Suite 200: 50 kW.",
      "After-hours HVAC is available at a rate of $45.00 per hour upon reasonable advance request.",
      "Premises are ADA compliant as of the Commencement Date. Tenant is responsible for maintaining ADA compliance within the premises.",
      "Fifteen (15) dedicated patient parking spaces are reserved adjacent to the building entrance nearest Suite 200.",
      "Landlord shall maintain medical waste dumpster enclosure in compliance with Maricopa County Health Department regulations.",
    ],
    additionalClauses: [
      "ARTICLE 11 - HIPAA COMPLIANCE\nLandlord acknowledges that Tenant is subject to the Health Insurance Portability and Accountability Act (HIPAA). Landlord agrees to maintain reasonable physical security measures for the building and shall provide Tenant with prior notice of any building maintenance activities that may require access to the premises. Any Landlord personnel entering the premises shall comply with Tenant's privacy and infection control protocols.",
      "ARTICLE 12 - MEDICAL BUILDOUT\nLandlord has provided a tenant improvement allowance of $55.00 per square foot ($209,000 total) for medical-grade buildout of the premises. Improvements include exam rooms, reception area, nurse station, lab area, and minor procedure room. All improvements shall be constructed in accordance with Arizona Department of Health Services requirements.",
    ],
  },
  {
    filename: "Restaurant Space - The Rustic Table.pdf",
    landlord: "Historic Charleston Properties",
    tenant: "The Rustic Table LLC",
    address: "1200 Main Street, Ground Floor, Charleston, SC 29401",
    sqft: 2800,
    leaseType: "Triple Net (NNN)",
    startDate: "January 15, 2025",
    endDate: "January 14, 2035",
    monthlyRent: 9200,
    securityDeposit: 55200,
    permittedUse: "Full-service restaurant, bar, catering preparation, and outdoor dining on the approved patio area as shown in Exhibit C. Tenant must maintain all required food service licenses and liquor licenses throughout the lease term.",
    renewalOptions: "One (1) ten-year renewal option at fair market value for comparable restaurant space in the Charleston Historic District. Tenant must provide written notice of intent to renew at least one hundred eighty (180) days prior to expiration.",
    terminationClauses: "Landlord may terminate this Lease if the restaurant ceases operations for more than ninety (90) consecutive days, unless such cessation is due to fire, casualty, or force majeure. Tenant has no early termination right. Upon termination, Tenant shall restore the premises to its original condition, normal wear and tear excepted.",
    tenantMaintenance: ["All kitchen equipment including commercial range, hood, refrigeration, and dishwasher", "Grease traps and grease interceptors (quarterly cleaning required)", "Hood and exhaust systems including fire suppression", "Interior buildout, finishes, and decorative elements", "Pest control (monthly service required)", "Patio furniture, planters, and outdoor dining area maintenance"],
    landlordMaintenance: ["Structural elements including foundation, load-bearing walls, and roof structure", "Roof membrane and waterproofing", "Exterior facade maintenance and repair in compliance with Charleston Historic Preservation requirements", "Gas line to the meter"],
    insuranceTypes: ["General Liability ($2,000,000 per occurrence)", "Liquor Liability ($2,000,000 per occurrence)", "Property Insurance (replacement cost for tenant improvements)", "Workers Compensation (statutory limits)", "Food Contamination/Spoilage ($500,000)"],
    minimumCoverage: "$2,000,000",
    taxObligations: "Tenant shall pay one hundred percent (100%) of all real estate taxes directly to the Charleston County Tax Collector. Tenant shall provide Landlord with evidence of timely payment within thirty (30) days of each payment date.",
    camCharges: "Not applicable. The premises constitute a standalone ground floor unit with dedicated entrance. Tenant is solely responsible for all maintenance of the premises and the approved outdoor dining area.",
    escalationClauses: "Percentage rent: In addition to base rent, Tenant shall pay 6% of annual gross sales exceeding $1,200,000. Gross sales reports and percentage rent payments are due within thirty (30) days following the end of each calendar quarter. Tenant shall provide certified annual gross sales figures within ninety (90) days of each lease year end.",
    keyProvisions: [
      "Landlord shall use commercially reasonable efforts to assist Tenant in the transfer of existing liquor license (SC License No. 2024-CHR-4521) from the prior tenant.",
      "The approved outdoor dining area on the public sidewalk is subject to City of Charleston Encroachment Permit EC-2024-0892. Tenant is responsible for permit renewal and compliance with all conditions.",
      "Landlord is responsible for all exterior facade work in compliance with Charleston Board of Architectural Review requirements. Tenant shall not make any exterior modifications without prior BAR approval.",
      "Grease trap serving the premises must be upgraded to a minimum 100-gallon capacity within 90 days of the Commencement Date, at Tenant's sole expense.",
      "Kitchen exhaust venting is through a dedicated rooftop stack as shown in Exhibit D. Tenant is responsible for maintenance and cleaning of the exhaust duct from kitchen to roof.",
    ],
    additionalClauses: [
      "ARTICLE 11 - HISTORIC PRESERVATION\nThe premises are located within the Charleston Historic District and are subject to regulations of the Charleston Board of Architectural Review (BAR). Any modifications to the exterior of the premises, including signage, lighting, awnings, and the outdoor dining area, must receive prior approval from the BAR. Landlord shall cooperate with Tenant in seeking BAR approval for reasonable modifications.",
      "ARTICLE 12 - HOURS OF OPERATION\nTenant shall operate the restaurant no fewer than five (5) days per week, serving both lunch and dinner service. Sunday hours are at Tenant's discretion. Tenant shall maintain posted hours of operation visible from the street.",
      "ARTICLE 13 - ALCOHOL SERVICE\nTenant shall maintain a valid South Carolina liquor license throughout the lease term. Loss or suspension of the liquor license for more than sixty (60) days shall constitute a default under this Lease. All alcohol service must comply with SC Title 61 and applicable Charleston City ordinances.",
    ],
  },
  {
    filename: "Tech Startup Flex Space - Level 3.pdf",
    landlord: "Capital Factory Real Estate",
    tenant: "NeuralPath AI Inc",
    address: "700 Innovation Drive, Level 3, Austin, TX 78701",
    sqft: 4500,
    leaseType: "Gross",
    startDate: "March 1, 2025",
    endDate: "February 28, 2027",
    monthlyRent: 18000,
    securityDeposit: 36000,
    permittedUse: "Technology office, software development, data processing, and server room operations. Tenant may install computing equipment not exceeding the electrical and cooling capacity of the premises as specified in Exhibit B.",
    renewalOptions: "No formal renewal option. Upon expiration of the initial term, this Lease shall convert to a month-to-month tenancy at 110% of the final month's rent. Either party may terminate the month-to-month tenancy upon sixty (60) days written notice.",
    terminationClauses: "Either party may terminate this Lease upon ninety (90) days prior written notice at any time after the first twelve (12) months of the term. If Tenant terminates during the initial term, Tenant shall forfeit the security deposit.",
    tenantMaintenance: ["Interior furnishings and personal property", "IT infrastructure including network cabling and equipment", "Server room supplemental cooling equipment", "Interior cleanliness above standard janitorial"],
    landlordMaintenance: ["All building systems including HVAC, electrical, plumbing, and fire safety", "Janitorial services five (5) days per week", "Building security and access control", "Parking garage maintenance", "All common areas and shared amenities", "Elevator maintenance"],
    insuranceTypes: ["General Liability ($2,000,000 per occurrence)", "Cyber Liability ($2,000,000 per occurrence)", "Property Insurance (contents and equipment)"],
    minimumCoverage: "$2,000,000",
    taxObligations: "All real estate taxes are included in the gross rent. Tenant has no separate tax obligation.",
    camCharges: "All common area maintenance is included in the gross rent. Tenant has full access to shared conference rooms, kitchens, phone booths, event space, and outdoor terraces at no additional charge.",
    escalationClauses: "No rent escalation during the initial two-year term. If the Lease converts to month-to-month, rent shall be 110% of the final month's base rent.",
    keyProvisions: [
      "100 Gbps dedicated fiber internet connectivity is included in the rent. Service is provided by AT&T Fiber with a guaranteed 99.99% uptime SLA.",
      "Dedicated server room (approximately 200 SF) with supplemental CRAC cooling and UPS backup. Power capacity: 30 kW.",
      "Access to four (4) shared conference rooms (seats 6-20) via online booking system. Priority booking for Level 3 tenants.",
      "Secure bike storage for up to 20 bicycles on Level B1, with shower facilities on Level 1.",
      "Dog-friendly policy: Tenant may bring up to three (3) well-behaved dogs to the premises. Tenant is responsible for any damage caused by animals.",
      "Landlord provides complimentary coffee, tea, and filtered water in common kitchen areas.",
    ],
    additionalClauses: [
      "ARTICLE 11 - DATA SECURITY\nLandlord shall maintain physical security measures including keycard access, CCTV monitoring of common areas and entry points, and 24/7 security personnel. Landlord shall not access Tenant's server room without Tenant's prior consent except in the case of emergency (fire, flood, or imminent threat to life safety).",
      "ARTICLE 12 - COMMUNITY EVENTS\nLandlord hosts weekly community events including tech talks, networking events, and social gatherings. Tenant's employees are welcome to attend. Tenant may host events in the common event space subject to availability and Landlord's event policies.",
    ],
  },
  {
    filename: "Anchor Retail - Big Box Store.pdf",
    landlord: "Regency Centers Corporation",
    tenant: "HomeMax Superstore Inc",
    address: "5500 Gateway Boulevard, Pad A, Jacksonville, FL 32218",
    sqft: 95000,
    leaseType: "Absolute Triple Net (NNN)",
    startDate: "August 1, 2020",
    endDate: "July 31, 2040",
    monthlyRent: 125000,
    securityDeposit: 0,
    permittedUse: "Home improvement retail, garden center, lumber yard, tool rental, and installation services. Tenant may also operate an outdoor seasonal sales area as shown in Exhibit E.",
    renewalOptions: "Four (4) five-year renewal options at the lesser of (a) CPI-adjusted rent or (b) 95% of the then-prevailing fair market value for comparable anchor retail space in the Jacksonville metropolitan area. Notice of renewal required no later than twelve (12) months prior to expiration.",
    terminationClauses: "Tenant may terminate after Year 10 if the Co-Tenancy Clause (Article 15) is violated for a continuous period of twelve (12) months, provided Tenant has first given Landlord notice and a six (6) month cure period. No other early termination right exists for either party.",
    tenantMaintenance: ["Entire premises including roof, roof membrane, and all rooftop equipment", "Structural elements and foundation (absolute NNN)", "Parking lot including repaving, striping, lighting, and drainage", "Landscaping and irrigation for the pad site", "All HVAC equipment, including replacement", "Building exterior including facade, paint, and signage", "Fire and life safety systems"],
    landlordMaintenance: ["None. This is an absolute NNN lease. Tenant is responsible for 100% of all maintenance, repairs, and capital replacements for the premises and the pad site."],
    insuranceTypes: ["General Liability ($25,000,000 per occurrence)", "Property Insurance (full replacement cost)", "Workers Compensation (statutory limits)", "Umbrella/Excess Liability ($25,000,000)", "Environmental Liability ($5,000,000)"],
    minimumCoverage: "$25,000,000",
    taxObligations: "Tenant shall pay one hundred percent (100%) of all real estate taxes, assessments, and governmental charges directly to the Duval County Tax Collector. Tenant shall have the right to contest any tax assessment in good faith, provided Tenant posts adequate security for payment.",
    camCharges: "Not applicable for the pad site. Tenant contributes $0.50 per square foot ($47,500 annually) to the Gateway Shopping Center marketing fund for advertising, promotions, and events.",
    escalationClauses: "Base rent increases by a fixed 10% every five (5) years on the anniversary of the Commencement Date. This increase is not compounding (each increase is calculated on the original base rent of $125,000/month).",
    keyProvisions: [
      "Co-Tenancy Clause: Landlord shall maintain a minimum occupancy level of 70% of the gross leasable area of Gateway Shopping Center. If occupancy falls below 70% for twelve (12) consecutive months, Tenant may (a) reduce rent to 50% of base rent during the period of non-compliance, or (b) terminate the Lease upon six (6) months written notice.",
      "Exclusive Use: No other tenant within a 3-mile radius of the Shopping Center that is controlled by Landlord or its affiliates may operate a home improvement, hardware, lumber, or tool rental business.",
      "Pylon Sign: Tenant is entitled to the top position on the Gateway Shopping Center pylon sign with a minimum sign face of 80 square feet.",
      "Building Signage: Tenant may install illuminated signage on all four (4) building facades, subject to local code compliance.",
      "Drive-Through Lumber Yard: Tenant operates a drive-through lumber yard on the east side of the building as shown in Exhibit E. The lumber yard area (approximately 15,000 SF) is included in the leased premises.",
      "Garden Center: Tenant operates a 10,000 SF enclosed garden center with retractable roof panels on the south side of the building.",
      "No security deposit required based on Tenant's investment-grade credit rating (S&P: BBB+).",
    ],
    additionalClauses: [
      "ARTICLE 15 - CO-TENANCY\nLandlord represents that as of the Commencement Date, Gateway Shopping Center has a gross leasable area of approximately 450,000 square feet with 92% occupancy. Landlord agrees to use commercially reasonable efforts to maintain occupancy above 70%. The co-tenancy requirement shall be measured quarterly based on the ratio of occupied gross leasable area to total gross leasable area.",
      "ARTICLE 16 - EXCLUSIVE USE\nLandlord covenants that it will not lease, rent, or permit any space within the Gateway Shopping Center or within a 3-mile radius of the Shopping Center that is owned or controlled by Landlord to any tenant whose primary business is home improvement retail, hardware sales, lumber sales, or tool rental. This restriction shall not apply to general merchandise retailers that incidentally sell hardware items.",
      "ARTICLE 17 - CAPITAL IMPROVEMENTS\nAs an absolute NNN lease, Tenant is responsible for all capital improvements including but not limited to roof replacement, HVAC replacement, parking lot repaving, and structural repairs. Tenant shall maintain a capital reserve account with a minimum balance of $500,000 for such purposes.",
    ],
  },
  {
    filename: "Ground Lease - Gas Station Parcel.pdf",
    landlord: "Highway Land Holdings LP",
    tenant: "PetroStar Convenience LLC",
    address: "12100 Interstate Highway 35, Parcel 7, San Marcos, TX 78666",
    sqft: 3200,
    leaseType: "Ground Lease",
    startDate: "January 1, 2019",
    endDate: "December 31, 2068",
    monthlyRent: 8500,
    securityDeposit: 25000,
    permittedUse: "Gasoline and diesel fueling station, convenience store, automated car wash, and electric vehicle (EV) charging stations. Tenant may install up to twelve (12) fuel dispensers and up to eight (8) EV charging stations.",
    renewalOptions: "Two (2) ten-year renewal options at fair market ground rent as determined by an MAI-certified appraiser selected by mutual agreement. If parties cannot agree on an appraiser, each party shall select one appraiser, and the two appraisers shall select a third. The fair market ground rent shall be the average of the two closest appraisals.",
    terminationClauses: "Landlord may terminate for environmental contamination where estimated remediation costs exceed $500,000 and Tenant fails to commence remediation within ninety (90) days of notice. Tenant may terminate with twenty-four (24) months prior written notice after Year 25 of the initial term.",
    tenantMaintenance: ["All improvements including buildings, canopy structures, and fuel island", "Underground storage tanks (USTs) and fuel dispensing equipment", "Paving, curbing, and striping for the entire pad site", "Landscaping, fencing, and perimeter improvements", "All signage including pylon sign, canopy signs, and building signs", "Environmental compliance including UST monitoring and reporting", "Car wash equipment and water reclamation system", "EV charging equipment and electrical infrastructure"],
    landlordMaintenance: ["None. This is a ground lease. Tenant is responsible for all improvements on the land."],
    insuranceTypes: ["General Liability ($10,000,000 per occurrence)", "Property Insurance (full replacement cost of all improvements)", "Environmental/Pollution Liability ($10,000,000)", "Underground Storage Tank (UST) Liability ($5,000,000)", "Workers Compensation (statutory limits)"],
    minimumCoverage: "$10,000,000",
    taxObligations: "Tenant shall pay all real estate taxes on both the land and all improvements. Tenant shall be solely responsible for any personal property taxes on equipment, inventory, and trade fixtures.",
    camCharges: "Not applicable. Ground lease with no common areas.",
    escalationClauses: "Ground rent is adjusted every five (5) years based on the Consumer Price Index (CPI-U, South Region). Minimum increase: 10% per adjustment period. Maximum increase: 25% per adjustment period. No decrease permitted.",
    keyProvisions: [
      "Initial lease term: Fifty (50) years, one of the longest ground lease terms in the state.",
      "Tenant owns all improvements constructed on the land during the lease term. Improvements include the convenience store building (3,200 SF), fuel canopy, car wash structure, and all site improvements.",
      "At lease expiration or termination, all improvements shall revert to Landlord at no cost. Tenant shall have no claim to the value of improvements.",
      "Tenant provides a comprehensive environmental indemnification to Landlord covering all environmental conditions arising from Tenant's operations, including but not limited to petroleum releases, UST leaks, and soil or groundwater contamination.",
      "Tenant has the right to install EV charging infrastructure, including Level 2 and DC Fast Charging equipment, on the premises. Electrical infrastructure upgrades required for EV charging are at Tenant's sole expense.",
      "Landlord grants Tenant an access easement over Parcel 6 for ingress and egress from IH-35 frontage road as shown in Exhibit A.",
    ],
    additionalClauses: [
      "ARTICLE 11 - ENVIRONMENTAL COMPLIANCE\nTenant shall comply with all applicable federal, state, and local environmental laws and regulations, including but not limited to the Resource Conservation and Recovery Act (RCRA), the Comprehensive Environmental Response, Compensation, and Liability Act (CERCLA), and the Texas Commission on Environmental Quality (TCEQ) regulations regarding underground storage tanks. Tenant shall maintain current UST registrations and shall submit all required monitoring reports to TCEQ in a timely manner.",
      "ARTICLE 12 - LENDER PROVISIONS\nTenant may mortgage its leasehold interest and improvements with Landlord's prior written consent, which shall not be unreasonably withheld. Landlord agrees to provide a subordination, non-disturbance, and attornment agreement (SNDA) to Tenant's lender in a commercially reasonable form.",
      "ARTICLE 13 - RIGHT OF FIRST REFUSAL\nIf Landlord receives a bona fide offer to purchase the land (Parcel 7), Landlord shall first offer to sell the land to Tenant on the same terms and conditions. Tenant shall have thirty (30) days to accept or decline the offer. This right of first refusal shall survive throughout the lease term and any renewal periods.",
    ],
  },
  {
    filename: "Coworking Sublease - WeSpace Floor 12.pdf",
    landlord: "WeSpace Inc (Sublandlord / Master Tenant)",
    tenant: "DataVault Solutions (Subtenant)",
    address: "350 Market Street, Floor 12, San Francisco, CA 94105",
    sqft: 5200,
    leaseType: "Gross (Sublease)",
    startDate: "April 1, 2025",
    endDate: "March 31, 2026",
    monthlyRent: 32000,
    securityDeposit: 64000,
    permittedUse: "General office use consistent with the terms of the Master Lease between WeSpace Inc and 350 Market Street LLC dated August 15, 2019. No cooking, no storage of hazardous materials, no manufacturing or production activities.",
    renewalOptions: "No renewal option. This Sublease expires simultaneously with or before the Master Lease expiration date of December 31, 2027. If the Sublease expires and the Master Lease remains in effect, Subtenant may convert to a month-to-month tenancy at 150% of the final month's rent, subject to Sublandlord's consent.",
    terminationClauses: "Either party may terminate this Sublease upon thirty (30) days prior written notice at any time. This Sublease shall automatically terminate upon termination of the Master Lease for any reason, including but not limited to Sublandlord default. In the event of Master Lease termination, Sublandlord shall provide Subtenant with as much advance notice as practicable.",
    tenantMaintenance: ["Keep the premises in good condition and repair", "Remove all personal property and trade fixtures upon expiration", "Repair any damage caused by Subtenant's installation or removal of equipment", "Standard office cleaning (Sublandlord provides baseline janitorial)"],
    landlordMaintenance: ["All furniture included in the premises (desks, chairs, storage)", "IT infrastructure including network switches and WiFi access points", "Daily cleaning and janitorial services", "HVAC operation and maintenance", "All building services as provided under the Master Lease", "Kitchen and common area supplies"],
    insuranceTypes: ["General Liability ($1,000,000 per occurrence)", "Property Insurance (contents only)"],
    minimumCoverage: "$1,000,000",
    taxObligations: "All real estate taxes are included in the gross rent. Subtenant has no separate tax obligation.",
    camCharges: "All common area charges are included in the gross rent. Subtenant has full access to shared kitchens on Floors 11 and 12, two lounges, six phone booths, a mothers room, and two large meeting rooms (by reservation).",
    escalationClauses: "No rent escalation during the twelve-month term. Month-to-month holdover at 150% of final month's rent.",
    keyProvisions: [
      "Premises are fully furnished with 52 workstations, 3 private offices, and 1 team room.",
      "Thirty-day termination clause allows either party to exit with minimal notice.",
      "Shared amenities include: commercial kitchen, cold brew on tap, beer taps (after 5 PM), wellness room, and bike storage.",
      "This Sublease is subordinate to the Master Lease between WeSpace Inc and 350 Market Street LLC. A copy of the Master Lease (with financial terms redacted) has been provided to Subtenant as Exhibit B.",
      "Subtenant shall not make any alterations, additions, or improvements to the premises without Sublandlord's prior written consent.",
      "Building provides 24/7 access via keycard. Subtenant will receive up to 60 keycards.",
    ],
    additionalClauses: [
      "ARTICLE 11 - MASTER LEASE OBLIGATIONS\nSubtenant acknowledges that this Sublease is subject to all terms and conditions of the Master Lease. Subtenant agrees to comply with all obligations of the Master Lease applicable to the subleased premises, except for the obligation to pay rent to the Master Landlord (which remains Sublandlord's obligation). A violation of the Master Lease by Subtenant shall constitute a default under this Sublease.",
      "ARTICLE 12 - NOISE AND CONDUCT\nSubtenant's employees shall maintain a professional and respectful office environment consistent with a shared coworking space. Excessive noise, disruptive behavior, or interference with other tenants' quiet enjoyment of the building may result in written warning and, if not cured within five (5) business days, may be treated as a default under this Sublease.",
    ],
  },
  {
    filename: "Agricultural Land Lease - Valley Farm.pdf",
    landlord: "Hernandez Family Trust",
    tenant: "Central Valley Organics LLC",
    address: "Rural Route 4, Sections 12-14, Valley Township, Fresno County, CA 93706",
    sqft: 0,
    leaseType: "Gross (Agricultural)",
    startDate: "January 1, 2024",
    endDate: "December 31, 2028",
    monthlyRent: 6250,
    securityDeposit: 12500,
    permittedUse: "Organic farming, crop cultivation, and agricultural processing and storage. No livestock operations permitted. Tenant must maintain current USDA organic certification (NOP) throughout the lease term.",
    renewalOptions: "Automatic renewal for successive five-year terms unless either party gives written notice of non-renewal at least twelve (12) months prior to the expiration of the then-current term. This Lease may continue indefinitely through automatic renewals.",
    terminationClauses: "Landlord may terminate if Tenant fails to maintain USDA organic certification for the leased acreage, provided Landlord gives Tenant ninety (90) days to cure (re-obtain certification). Tenant may terminate after crop failure in two (2) consecutive growing seasons, with six (6) months prior written notice. 'Crop failure' means a yield of less than 50% of the Fresno County average for the applicable crop type.",
    tenantMaintenance: ["All irrigation systems including wells, pumps, drip lines, and sprinklers", "Soil conservation measures including cover cropping and erosion control", "All fencing and boundary markers", "Farm access roads and internal roads", "Maintenance of USDA organic certification including record-keeping and inspections", "Pest management using only certified organic methods"],
    landlordMaintenance: ["Well pump replacement (well pump is owned by Landlord)", "Primary water infrastructure including main water lines from well to distribution point", "Property tax payment (factored into rent calculation)"],
    insuranceTypes: ["General Liability ($2,000,000 per occurrence)", "Crop Insurance (USDA Federal Crop Insurance program or equivalent)", "Workers Compensation (statutory limits)"],
    minimumCoverage: "$2,000,000",
    taxObligations: "Property taxes are paid by Landlord and are factored into the rent calculation. The property is assessed under California Williamson Act (Land Conservation Act) at agricultural use value.",
    camCharges: "Not applicable for agricultural land lease.",
    escalationClauses: "Rent is adjusted every two (2) years based on the USDA National Agricultural Statistics Service (NASS) farmland rental survey for Fresno County. Minimum monthly rent: $6,000. Rent shall not decrease below the prior period's rate.",
    keyProvisions: [
      "Total leased area: 480 acres across three (3) sections of Valley Township.",
      "Senior water rights: The property includes pre-1914 appropriative water rights to the Kings River, providing approximately 2,400 acre-feet per year. These water rights are critical and must not be abandoned or forfeited.",
      "USDA organic certification (NOP Certificate No. CA-2023-ORG-4891) must be maintained throughout the lease term and any renewal periods. Loss of certification is a default.",
      "Tenant must submit an annual crop rotation plan to Landlord no later than November 1 of each year for the following growing season. The plan must demonstrate sustainable farming practices.",
      "Tenant has a right of first refusal if the land is offered for sale. Landlord shall provide written notice of any bona fide offer, and Tenant shall have sixty (60) days to match the offer.",
      "Existing improvements on the property include: two wells (Well #12-A and Well #14-B), a 5,000 SF packing shed, a 2,000 SF cold storage facility, and equipment storage buildings.",
    ],
    additionalClauses: [
      "ARTICLE 11 - WATER RIGHTS\nThe pre-1914 appropriative water rights appurtenant to the property are among the most senior water rights in the Kings River system. Tenant shall exercise these water rights in accordance with all applicable California water law, including the reasonable and beneficial use doctrine. Tenant shall not waste water or allow water rights to be abandoned. Any reduction in water allocation due to drought, regulatory action, or court order shall not constitute a breach by either party but may form the basis for Tenant's crop failure termination right.",
      "ARTICLE 12 - SOIL HEALTH\nTenant shall maintain soil organic matter content at or above the level measured at the commencement of this Lease (baseline: 3.2% organic matter as measured by UC Davis Analytical Laboratory, Report No. 2023-FA-4412). Tenant shall conduct soil testing annually and provide results to Landlord. Any significant decline in soil health shall be addressed through Tenant's crop rotation and soil amendment program.",
      "ARTICLE 13 - WILLIAMSON ACT\nThe property is enrolled in the California Williamson Act (Government Code Section 51200 et seq.) providing for reduced property tax assessment in exchange for a commitment to maintain the land in agricultural use. Tenant shall not use the property for any purpose that would violate the Williamson Act or cause the property to lose its Williamson Act classification.",
    ],
  },
];

async function generatePDF(lease: LeaseData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await doc.embedFont(StandardFonts.TimesRomanBold);
  const fontSize = 11;
  const titleSize = 16;
  const headingSize = 13;
  const margin = 72;
  const lineHeight = fontSize * 1.4;

  let page = doc.addPage([612, 792]); // Letter size
  let y = 792 - margin;

  function addPage() {
    page = doc.addPage([612, 792]);
    y = 792 - margin;
  }

  function checkSpace(needed: number) {
    if (y - needed < margin) addPage();
  }

  function drawText(text: string, options: { font?: typeof font; size?: number; indent?: number; maxWidth?: number } = {}) {
    const f = options.font || font;
    const s = options.size || fontSize;
    const indent = options.indent || 0;
    const maxWidth = options.maxWidth || (612 - 2 * margin - indent);

    // Word-wrap the text
    const words = text.split(/\s+/);
    let line = "";

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const width = f.widthOfTextAtSize(testLine, s);
      if (width > maxWidth && line) {
        checkSpace(lineHeight);
        page.drawText(line, { x: margin + indent, y, size: s, font: f, color: rgb(0, 0, 0) });
        y -= lineHeight;
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      checkSpace(lineHeight);
      page.drawText(line, { x: margin + indent, y, size: s, font: f, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }
  }

  function drawHeading(text: string) {
    y -= lineHeight * 0.5;
    checkSpace(headingSize * 2);
    drawText(text, { font: boldFont, size: headingSize });
    y -= 4;
  }

  function drawBullet(text: string) {
    checkSpace(lineHeight);
    page.drawText("\u2022", { x: margin + 10, y, size: fontSize, font, color: rgb(0, 0, 0) });
    drawText(text, { indent: 24 });
  }

  // Title
  checkSpace(titleSize * 3);
  const title = "COMMERCIAL LEASE AGREEMENT";
  const titleWidth = boldFont.widthOfTextAtSize(title, titleSize);
  page.drawText(title, { x: (612 - titleWidth) / 2, y, size: titleSize, font: boldFont, color: rgb(0, 0, 0) });
  y -= titleSize * 2.5;

  // Preamble
  drawText(`This Lease Agreement ("Lease") is entered into and made effective as of ${lease.startDate}, by and between:`);
  y -= lineHeight * 0.5;
  drawText(`LANDLORD: ${lease.landlord}`, { font: boldFont });
  drawText(`TENANT: ${lease.tenant}`, { font: boldFont });
  y -= lineHeight;

  drawText(`WHEREAS, Landlord is the owner of certain real property located at ${lease.address}; and`);
  drawText(`WHEREAS, Tenant desires to lease said premises for the purpose of ${lease.permittedUse.split('.')[0].toLowerCase()};`);
  drawText(`NOW, THEREFORE, in consideration of the mutual covenants and agreements herein contained, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the parties agree as follows:`);
  y -= lineHeight;

  // Article 1 - Premises
  drawHeading("ARTICLE 1 - PREMISES");
  drawText(`1.1 Landlord hereby leases to Tenant, and Tenant hereby leases from Landlord, the premises located at ${lease.address}${lease.sqft > 0 ? `, comprising approximately ${lease.sqft.toLocaleString()} rentable square feet` : ""} (the "Premises"), as more particularly described in Exhibit A attached hereto and incorporated herein by reference.`);
  if (lease.sqft > 0) {
    drawText(`1.2 The Premises consist of approximately ${lease.sqft.toLocaleString()} square feet of ${lease.leaseType} space as measured in accordance with BOMA standards (ANSI/BOMA Z65.1-2017).`);
  }
  y -= lineHeight * 0.5;

  // Article 2 - Term
  drawHeading("ARTICLE 2 - TERM");
  drawText(`2.1 The term of this Lease shall commence on ${lease.startDate} (the "Commencement Date") and shall expire on ${lease.endDate} (the "Expiration Date"), unless sooner terminated in accordance with the provisions of this Lease.`);
  drawText(`2.2 Renewal Options: ${lease.renewalOptions}`);
  y -= lineHeight * 0.5;

  // Article 3 - Rent
  drawHeading("ARTICLE 3 - RENT");
  drawText(`3.1 Base Rent: Tenant shall pay to Landlord base monthly rent in the amount of $${lease.monthlyRent.toLocaleString()}.00 per month, payable in advance on the first day of each calendar month during the term of this Lease. Annual base rent equals $${(lease.monthlyRent * 12).toLocaleString()}.00.`);
  drawText(`3.2 Security Deposit: ${lease.securityDeposit > 0 ? `Tenant shall deposit with Landlord a security deposit in the amount of $${lease.securityDeposit.toLocaleString()}.00, to be held by Landlord as security for the faithful performance by Tenant of all terms, covenants, and conditions of this Lease. The security deposit shall be returned to Tenant within thirty (30) days following the expiration or earlier termination of this Lease, less any amounts applied to cure Tenant defaults.` : "No security deposit is required under this Lease."}`);
  drawText(`3.3 Escalation: ${lease.escalationClauses}`);
  drawText(`3.4 Late Payment: If any installment of rent is not received by Landlord within five (5) business days after the due date, Tenant shall pay a late charge equal to 5% of the overdue amount, plus interest at the rate of 1.5% per month on the unpaid balance.`);
  y -= lineHeight * 0.5;

  // Article 4 - Permitted Use
  drawHeading("ARTICLE 4 - PERMITTED USE");
  drawText(`4.1 ${lease.permittedUse}`);
  drawText(`4.2 Tenant shall not use the Premises for any unlawful purpose or in any manner that would constitute a nuisance, violate any applicable zoning ordinance, or increase the rate of insurance on the Premises or the building in which the Premises are located.`);
  y -= lineHeight * 0.5;

  // Article 5 - Lease Type and Additional Charges
  drawHeading("ARTICLE 5 - LEASE TYPE AND ADDITIONAL CHARGES");
  drawText(`5.1 Lease Type: This Lease is a ${lease.leaseType} lease.`);
  drawText(`5.2 CAM Charges: ${lease.camCharges}`);
  drawText(`5.3 Tax Obligations: ${lease.taxObligations}`);
  y -= lineHeight * 0.5;

  // Article 6 - Renewal
  drawHeading("ARTICLE 6 - RENEWAL OPTIONS");
  drawText(`6.1 ${lease.renewalOptions}`);
  y -= lineHeight * 0.5;

  // Article 7 - Termination
  drawHeading("ARTICLE 7 - TERMINATION");
  drawText(`7.1 ${lease.terminationClauses}`);
  drawText(`7.2 Upon expiration or termination, Tenant shall surrender the Premises in good condition and repair, reasonable wear and tear excepted, and shall remove all personal property and trade fixtures.`);
  y -= lineHeight * 0.5;

  // Article 8 - Maintenance
  drawHeading("ARTICLE 8 - MAINTENANCE AND REPAIRS");
  drawText("8.1 Tenant Responsibilities:", { font: boldFont });
  for (const item of lease.tenantMaintenance) {
    drawBullet(item);
  }
  y -= lineHeight * 0.3;
  drawText("8.2 Landlord Responsibilities:", { font: boldFont });
  for (const item of lease.landlordMaintenance) {
    drawBullet(item);
  }
  y -= lineHeight * 0.5;

  // Article 9 - Insurance
  drawHeading("ARTICLE 9 - INSURANCE");
  drawText("9.1 Tenant shall maintain the following insurance coverages throughout the term of this Lease:");
  for (const ins of lease.insuranceTypes) {
    drawBullet(ins);
  }
  drawText(`9.2 Minimum aggregate coverage: ${lease.minimumCoverage}.`);
  drawText("9.3 Tenant shall name Landlord as an additional insured on all liability policies and shall provide Landlord with certificates of insurance upon request.");
  drawText("9.4 All insurance policies shall be issued by carriers with an A.M. Best rating of A- VII or better.");
  y -= lineHeight * 0.5;

  // Article 10 - Key Provisions
  drawHeading("ARTICLE 10 - KEY PROVISIONS AND SPECIAL TERMS");
  for (let i = 0; i < lease.keyProvisions.length; i++) {
    drawText(`10.${i + 1} ${lease.keyProvisions[i]}`);
  }
  y -= lineHeight * 0.5;

  // Additional articles
  for (const clause of lease.additionalClauses) {
    const [heading, ...body] = clause.split("\n");
    drawHeading(heading);
    drawText(body.join(" "));
    y -= lineHeight * 0.5;
  }

  // Standard boilerplate
  drawHeading("GENERAL PROVISIONS");

  drawText("Governing Law: This Lease shall be governed by and construed in accordance with the laws of the state in which the Premises are located, without regard to conflict of law principles.");
  y -= lineHeight * 0.3;
  drawText("Entire Agreement: This Lease constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior negotiations, representations, warranties, commitments, offers, and agreements, whether written or oral.");
  y -= lineHeight * 0.3;
  drawText("Amendments: This Lease may not be modified or amended except by a written instrument signed by both Landlord and Tenant.");
  y -= lineHeight * 0.3;
  drawText("Notices: All notices required or permitted under this Lease shall be in writing and shall be deemed delivered when personally delivered, or three (3) business days after deposit in the United States mail, postage prepaid, certified mail, return receipt requested, addressed to the respective parties at the addresses set forth above or at such other address as either party may designate by notice.");
  y -= lineHeight * 0.3;
  drawText("Severability: If any provision of this Lease is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.");
  y -= lineHeight * 0.3;
  drawText("Waiver: The failure of either party to enforce any provision of this Lease shall not be construed as a waiver of such provision or the right to enforce it at a later time.");
  y -= lineHeight;

  // Signature block
  drawHeading("SIGNATURES");
  drawText("IN WITNESS WHEREOF, the parties have executed this Lease as of the date first written above.");
  y -= lineHeight * 2;

  drawText("LANDLORD:", { font: boldFont });
  y -= lineHeight * 1.5;
  page.drawText("_______________________________", { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
  y -= lineHeight;
  drawText(lease.landlord);
  drawText(`Date: ${lease.startDate}`);
  y -= lineHeight;

  drawText("TENANT:", { font: boldFont });
  y -= lineHeight * 1.5;
  checkSpace(lineHeight * 4);
  page.drawText("_______________________________", { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
  y -= lineHeight;
  drawText(lease.tenant);
  drawText(`Date: ${lease.startDate}`);

  return doc.save();
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const lease of leases) {
    console.log(`Generating: ${lease.filename}`);
    const pdfBytes = await generatePDF(lease);
    fs.writeFileSync(path.join(OUTPUT_DIR, lease.filename), pdfBytes);
    console.log(`  Created: ${lease.filename} (${Math.round(pdfBytes.length / 1024)} KB, ${(await PDFDocument.load(pdfBytes)).getPageCount()} pages)`);
  }

  console.log(`\nGenerated ${leases.length} PDFs in ${OUTPUT_DIR}`);
}

main().catch(console.error);
