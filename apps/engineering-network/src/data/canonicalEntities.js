// Stable mock identities. Slugs are aliases, never separate entities.
export const ORGANIZATIONS = {
  "ORG-A": {
    "id": "ORG-A",
    "name": "Demo Organization A",
    "fullName": "Demo Organization A (Mock Legal Entity)",
    "role": "Owner / Client",
    "roleCode": "OWNER_CLIENT",
    "isMock": true
  },
  "ORG-B": {
    "id": "ORG-B",
    "name": "Demo Organization B",
    "fullName": "Demo Organization B (Mock Legal Entity)",
    "role": "EPC General Contractor",
    "roleCode": "EPC_GENERAL_CONTRACTOR",
    "isMock": true
  },
  "ORG-C": {
    "id": "ORG-C",
    "name": "Demo Organization C",
    "fullName": "Demo Organization C (Mock Legal Entity)",
    "role": "Design & BIM",
    "roleCode": "DESIGN_BIM",
    "isMock": true
  },
  "ORG-D": {
    "id": "ORG-D",
    "name": "Demo Organization D",
    "fullName": "Demo Organization D (Mock Legal Entity)",
    "role": "Foundations Contractor",
    "roleCode": "FOUNDATIONS_CONTRACTOR",
    "isMock": true
  },
  "ORG-E": {
    "id": "ORG-E",
    "name": "Demo Organization E",
    "fullName": "Demo Organization E (Mock Legal Entity)",
    "role": "Cleanroom MEP Contractor",
    "roleCode": "CLEANROOM_MEP_CONTRACTOR",
    "isMock": true
  },
  "ORG-F": {
    "id": "ORG-F",
    "name": "Demo Organization F",
    "fullName": "Demo Organization F (Mock Legal Entity)",
    "role": "Equipment Integrator",
    "roleCode": "EQUIPMENT_INTEGRATOR",
    "isMock": true
  },
  "ORG-G": {
    "id": "ORG-G",
    "name": "Demo Organization G",
    "fullName": "Demo Organization G (Mock Legal Entity)",
    "role": "Supervision & Quality",
    "roleCode": "SUPERVISION_QUALITY",
    "isMock": true
  },
  "ORG-H": {
    "id": "ORG-H",
    "name": "Demo Organization H",
    "fullName": "Demo Organization H (Mock Legal Entity)",
    "role": "Steel Fabricator",
    "roleCode": "STEEL_FABRICATOR",
    "isMock": true
  }
};
export const PERSONS = {
  "ENG-01": {
    "id": "ENG-01",
    "name": "Demo Engineer 01",
    "title": "Construction Site Director (Mock)",
    "orgId": "ORG-B",
    "orgName": "Demo Organization B",
    "isMock": true
  },
  "ENG-02": {
    "id": "ENG-02",
    "name": "Demo Engineer 02",
    "title": "Structural Design Director (Mock)",
    "orgId": "ORG-C",
    "orgName": "Demo Organization C",
    "isMock": true
  },
  "ENG-03": {
    "id": "ENG-03",
    "name": "Demo Engineer 03",
    "title": "MEP Project Manager (Mock)",
    "orgId": "ORG-E",
    "orgName": "Demo Organization E",
    "isMock": true
  },
  "ENG-04": {
    "id": "ENG-04",
    "name": "Demo Engineer 04",
    "title": "Chief Supervision Engineer (Mock)",
    "orgId": "ORG-G",
    "orgName": "Demo Organization G",
    "isMock": true
  },
  "ENG-05": {
    "id": "ENG-05",
    "name": "Demo Engineer 05",
    "title": "Geotechnical Director (Mock)",
    "orgId": "ORG-D",
    "orgName": "Demo Organization D",
    "isMock": true
  }
};
export function canonicalEntity(id) {
 if (typeof id !== 'string') return undefined;
 const key = id.trim().toUpperCase().replace(/^DEMO-ORG-/, 'ORG-').replace(/^DEMO-ENGINEER-/, 'ENG-');
 return Object.hasOwn(ORGANIZATIONS, key) ? ORGANIZATIONS[key] : Object.hasOwn(PERSONS, key) ? PERSONS[key] : undefined;
}
