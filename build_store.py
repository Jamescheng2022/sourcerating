import urllib.request
import urllib.error
import json
import time

TOKEN = 'YOUR_SHOPIFY_TOKEN'
SHOP = 'YOUR_SHOPIFY_STORE_DOMAIN'
BASE = f'https://{SHOP}/admin/api/2024-01'
HEADERS = {
    'X-Shopify-Access-Token': TOKEN,
    'Content-Type': 'application/json'
}

def api(method, endpoint, data=None):
    url = BASE + endpoint
    body = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=body, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f'  HTTP {e.code}: {e.read().decode()}')
        return None

def create_collections():
    print('\n=== ÂàõÂª∫‰∫ßÂìÅÈõÜÂêà ===')
    collections = [
        {'title': 'Anchors & Fasteners', 'handle': 'anchors-fasteners',
         'body_html': '<p>High-strength concrete anchors, chemical anchors, and fastening systems engineered for structural applications. Factory-direct supply with full technical documentation.</p>'},
        {'title': 'Embedded Parts', 'handle': 'embedded-parts',
         'body_html': '<p>Precision-engineered embedded hardware for precast and cast-in-place concrete structures. Includes lifting anchors, inserts, and cast-in channels.</p>'},
        {'title': 'Form Ties & Accessories', 'handle': 'form-ties-accessories',
         'body_html': '<p>Complete formwork tie systems including she-bolts, wall ties, coil rods, and all related accessories for concrete forming operations.</p>'},
        {'title': 'Plastic Components', 'handle': 'plastic-components',
         'body_html': '<p>Durable PVC cones, plastic sleeves, protective caps, and concrete spacers designed for formwork and embedded applications.</p>'},
    ]
    ids = {}
    for col in collections:
        r = api('POST', '/custom_collections.json', {'custom_collection': col})
        if r:
            cid = r['custom_collection']['id']
            ids[col['handle']] = cid
            print(f'  Ôø?{col["title"]} (ID: {cid})')
        time.sleep(0.5)
    return ids

def create_pages():
    print('\n=== ÂàõÂª∫Ê†∏ÂøÉÈ°µÈù¢ ===')
    pages = [
        {
            'title': 'About Us',
            'handle': 'about-us',
            'body_html': '''<h2>Factory-Direct Concrete Hardware Since 2006</h2>
<p>JamesBolt is a specialized manufacturer and exporter of concrete embedded hardware, anchoring systems, and formwork accessories. With over 18 years of production experience, we supply contractors, engineers, and distributors across 50+ countries.</p>
<h3>Why Choose JamesBolt?</h3>
<ul>
<li><strong>Factory Direct</strong> Ôø?No middlemen. Competitive pricing with consistent quality control.</li>
<li><strong>Engineering Support</strong> Ôø?Full technical documentation, load data, and installation guides provided.</li>
<li><strong>Custom Manufacturing</strong> Ôø?OEM/ODM capability for special specifications and private label orders.</li>
<li><strong>Fast Turnaround</strong> Ôø?In-stock SKUs ship within 3Ôø? business days. Custom orders in 15Ôø?5 days.</li>
<li><strong>Quality Certified</strong> Ôø?ISO 9001:2015 certified production facility.</li>
</ul>
<h3>Our Products</h3>
<p>We specialize in: Chemical Anchors, Concrete Lifting Anchors, Form Tie Systems, Embedded Sleeves & Conduits, Plastic Formwork Cones, and all related accessories.</p>
<h3>Contact Us</h3>
<p>Ready to discuss your project requirements? <a href="/pages/request-a-quote">Request a quote</a> or <a href="/pages/contact">contact our team</a> directly.</p>'''
        },
        {
            'title': 'Request a Quote',
            'handle': 'request-a-quote',
            'body_html': '''<h2>Request a Free Quote</h2>
<p>Fill in your requirements below and our team will respond within 24 hours with pricing, lead time, and technical details.</p>
<p><strong>For urgent inquiries:</strong> Email us directly at <a href="mailto:sales@jamesbolt.com">sales@jamesbolt.com</a></p>
<h3>What to Include in Your Request</h3>
<ul>
<li>Product type and specification (diameter, length, grade)</li>
<li>Required quantity (MOQ and order volume)</li>
<li>Destination country and port</li>
<li>Required certifications (CE, ASTM, etc.)</li>
<li>Target delivery date</li>
</ul>
<p><em>We offer free samples for qualified buyers. Please mention this in your inquiry.</em></p>
<p><strong>WhatsApp / WeChat:</strong> Available upon request<br>
<strong>Response time:</strong> Within 24 hours on business days</p>'''
        },
        {
            'title': 'Technical Resources',
            'handle': 'technical-resources',
            'body_html': '''<h2>Technical Resources & Documentation</h2>
<p>Download technical data sheets, installation guides, and load capacity charts for all JamesBolt products.</p>
<h3>Available Documentation</h3>
<ul>
<li><strong>Product Data Sheets</strong> Ôø?Dimensions, materials, mechanical properties</li>
<li><strong>Load Capacity Tables</strong> Ôø?Pull-out and shear strength values by embedment depth</li>
<li><strong>Installation Guides</strong> Ôø?Step-by-step instructions with diagrams</li>
<li><strong>Material Certificates</strong> Ôø?Mill test reports available on request</li>
<li><strong>CAD Drawings</strong> Ôø?2D/3D files available for standard products</li>
</ul>
<h3>Standards & Certifications</h3>
<ul>
<li>ISO 9001:2015 Quality Management System</li>
<li>Products tested to ASTM, EN, and AS/NZS standards</li>
<li>CE marking available for select product lines</li>
</ul>
<p>To request specific technical documents, please <a href="/pages/contact">contact us</a> with your product code and application details.</p>'''
        },
        {
            'title': 'Contact',
            'handle': 'contact',
            'body_html': '''<h2>Contact JamesBolt</h2>
<p>Our sales and technical team is ready to assist you with product selection, pricing, and project support.</p>
<h3>Get In Touch</h3>
<ul>
<li><strong>Email:</strong> <a href="mailto:sales@jamesbolt.com">sales@jamesbolt.com</a></li>
<li><strong>Business Hours:</strong> Monday Ôø?Friday, 9:00 AM Ôø?6:00 PM (GMT+8)</li>
<li><strong>Response Time:</strong> Within 24 hours</li>
</ul>
<h3>Request a Quote</h3>
<p>For pricing and product inquiries, please visit our <a href="/pages/request-a-quote">Quote Request page</a> for faster processing.</p>
<h3>Factory Location</h3>
<p>Manufacturing facility based in China. Export experience to USA, Australia, UK, Middle East, and Southeast Asia.</p>'''
        },
    ]
    for page in pages:
        r = api('POST', '/pages.json', {'page': page})
        if r:
            print(f'  Ôø?{page["title"]} Ôø?/pages/{page["handle"]}')
        time.sleep(0.5)

def create_products(collection_ids):
    print('\n=== ÂàõÂª∫‰∫ßÂìÅ ===')
    products = [
        {
            'title': 'Chemical Anchor Bolt Set Ôø?M12 to M24',
            'handle': 'chemical-anchor-bolt-set',
            'vendor': 'JamesBolt',
            'product_type': 'Anchors & Fasteners',
            'tags': 'anchor, chemical anchor, concrete fastener, epoxy anchor',
            'body_html': '''<h3>Chemical Anchor Bolt Set Ôø?High-Strength Epoxy Fixing System</h3>
<p>Factory-direct chemical anchor bolts for structural concrete and masonry applications. Suitable for cracked and uncracked concrete, seismic zones, and close edge/spacing installations.</p>
<h4>Specifications</h4>
<table>
<tr><td><strong>Thread Size</strong></td><td>M12 / M16 / M20 / M24</td></tr>
<tr><td><strong>Material</strong></td><td>Grade 4.8, 8.8, 5.6 carbon steel / 304 Stainless Steel</td></tr>
<tr><td><strong>Coating</strong></td><td>Hot-dip galvanized (HDG) / Plain / Zinc plated</td></tr>
<tr><td><strong>Embedment Depth</strong></td><td>80mm Ôø?210mm (size dependent)</td></tr>
<tr><td><strong>Concrete Strength</strong></td><td>C20 Ôø?C50</td></tr>
<tr><td><strong>Standard</strong></td><td>ASTM F1554 / EN 1992</td></tr>
</table>
<h4>Applications</h4>
<ul>
<li>Structural steel connections to concrete</li>
<li>Anchor bolts for machinery and equipment</li>
<li>Rebar connection and splicing</li>
<li>Seismic and high-load applications</li>
</ul>
<p><strong>MOQ:</strong> 100 sets | <strong>Lead Time:</strong> 3Ôø? days (stock) / 15 days (custom)<br>
<em>Technical data sheet and load capacity table available on request.</em></p>''',
            'variants': [
                {'title': 'M12 x 110mm Ôø?Carbon Steel HDG', 'price': '2.80', 'sku': 'CA-M12-110-HDG', 'inventory_quantity': 5000, 'inventory_management': 'shopify'},
                {'title': 'M16 x 125mm Ôø?Carbon Steel HDG', 'price': '4.20', 'sku': 'CA-M16-125-HDG', 'inventory_quantity': 5000, 'inventory_management': 'shopify'},
                {'title': 'M20 x 170mm Ôø?Carbon Steel HDG', 'price': '6.50', 'sku': 'CA-M20-170-HDG', 'inventory_quantity': 3000, 'inventory_management': 'shopify'},
                {'title': 'M24 x 210mm Ôø?Stainless Steel 304', 'price': '12.00', 'sku': 'CA-M24-210-SS304', 'inventory_quantity': 2000, 'inventory_management': 'shopify'},
            ],
            'collection': 'anchors-fasteners'
        },
        {
            'title': 'Concrete Wall Form Tie Rod System',
            'handle': 'concrete-wall-form-tie-rod',
            'vendor': 'JamesBolt',
            'product_type': 'Form Ties & Accessories',
            'tags': 'form tie, wall tie, she-bolt, coil rod, formwork',
            'body_html': '''<h3>Concrete Wall Form Tie Rod System</h3>
<p>Complete she-bolt / coil tie rod system for concrete wall formwork. High tensile strength with precision thread for reliable clamping force and easy form stripping.</p>
<h4>Specifications</h4>
<table>
<tr><td><strong>Rod Diameter</strong></td><td>15mm / 17mm / 20mm</td></tr>
<tr><td><strong>Thread Type</strong></td><td>Coil thread (3/4" coil) / Fine thread</td></tr>
<tr><td><strong>Material</strong></td><td>Q235 / Q345 carbon steel</td></tr>
<tr><td><strong>Tensile Strength</strong></td><td>Ôø?600 MPa</td></tr>
<tr><td><strong>Length</strong></td><td>Custom cut to wall thickness</td></tr>
<tr><td><strong>Coating</strong></td><td>Black / Galvanized</td></tr>
</table>
<h4>Kit Includes</h4>
<ul>
<li>Coil tie rod (custom length)</li>
<li>She-bolt / wing nut x2</li>
<li>Flat washer x2</li>
<li>Plastic cone x2 (optional)</li>
</ul>
<p><strong>MOQ:</strong> 200 sets | <strong>Lead Time:</strong> 5Ôø? days</p>''',
            'variants': [
                {'title': '15mm Rod Ôø?Standard Kit (wall 200mm)', 'price': '1.85', 'sku': 'FT-15-200-STD', 'inventory_quantity': 8000, 'inventory_management': 'shopify'},
                {'title': '17mm Rod Ôø?Standard Kit (wall 200mm)', 'price': '2.20', 'sku': 'FT-17-200-STD', 'inventory_quantity': 8000, 'inventory_management': 'shopify'},
                {'title': '20mm Rod Ôø?Heavy Duty Kit (wall 250mm)', 'price': '3.10', 'sku': 'FT-20-250-HD', 'inventory_quantity': 5000, 'inventory_management': 'shopify'},
            ],
            'collection': 'form-ties-accessories'
        },
        {
            'title': 'PVC Plastic Formwork Cone Ôø?15mm / 17mm / 20mm',
            'handle': 'pvc-plastic-formwork-cone',
            'vendor': 'JamesBolt',
            'product_type': 'Plastic Components',
            'tags': 'plastic cone, PVC cone, formwork cone, tie rod cone, concrete cone',
            'body_html': '''<h3>PVC Plastic Formwork Cone</h3>
<p>High-quality PVC plastic cones used with form tie rods to create clean tie holes in concrete walls. Allows easy rod removal and leaves a uniform conical recess for patching.</p>
<h4>Specifications</h4>
<table>
<tr><td><strong>Compatible Rod Size</strong></td><td>15mm / 17mm / 20mm</td></tr>
<tr><td><strong>Material</strong></td><td>Virgin PVC (UV resistant)</td></tr>
<tr><td><strong>Color</strong></td><td>Grey / Orange / Custom</td></tr>
<tr><td><strong>Outer Diameter</strong></td><td>32mm / 38mm / 42mm</td></tr>
<tr><td><strong>Length</strong></td><td>65mm standard</td></tr>
<tr><td><strong>Temp Range</strong></td><td>-20¬∞C to +60¬∞C</td></tr>
</table>
<h4>Features</h4>
<ul>
<li>Smooth taper for easy extraction after concrete set</li>
<li>Reusable multiple times</li>
<li>Leaves clean uniform recess Ôø?easy to patch</li>
<li>Bulk supply available for large projects</li>
</ul>
<p><strong>MOQ:</strong> 1,000 pcs | <strong>Unit Price from USD $0.08/pc</strong></p>''',
            'variants': [
                {'title': '15mm Ôø?Grey PVC (bag of 100)', 'price': '9.50', 'sku': 'PC-15-GRY-100', 'inventory_quantity': 50000, 'inventory_management': 'shopify'},
                {'title': '17mm Ôø?Grey PVC (bag of 100)', 'price': '10.50', 'sku': 'PC-17-GRY-100', 'inventory_quantity': 50000, 'inventory_management': 'shopify'},
                {'title': '20mm Ôø?Grey PVC (bag of 100)', 'price': '12.00', 'sku': 'PC-20-GRY-100', 'inventory_quantity': 30000, 'inventory_management': 'shopify'},
            ],
            'collection': 'plastic-components'
        },
        {
            'title': 'Concrete Lifting Anchor Ôø?Flat / Loop Type',
            'handle': 'concrete-lifting-anchor',
            'vendor': 'JamesBolt',
            'product_type': 'Embedded Parts',
            'tags': 'lifting anchor, concrete anchor, precast anchor, loop anchor, cast-in anchor',
            'body_html': '''<h3>Concrete Lifting Anchor Ôø?Flat & Loop Type</h3>
<p>Cast-in concrete lifting anchors designed for safe handling and transportation of precast concrete elements. Engineered to rated working load with safety factor of 4:1.</p>
<h4>Specifications</h4>
<table>
<tr><td><strong>Type</strong></td><td>Flat anchor / Loop anchor / Spherical head</td></tr>
<tr><td><strong>Working Load</strong></td><td>1.3T / 2.5T / 5T / 8T / 12T</td></tr>
<tr><td><strong>Material</strong></td><td>Q345B low alloy steel</td></tr>
<tr><td><strong>Safety Factor</strong></td><td>4:1 (WLL to break load)</td></tr>
<tr><td><strong>Surface</strong></td><td>Black / Hot-dip galvanized</td></tr>
<tr><td><strong>Certification</strong></td><td>Factory load test certificate included</td></tr>
</table>
<h4>Applications</h4>
<ul>
<li>Precast wall panels and slabs</li>
<li>Precast columns and beams</li>
<li>Tunnel segments</li>
<li>Any tilt-up or crane-lifted concrete element</li>
</ul>
<p><strong>MOQ:</strong> 50 pcs | Load test certificates provided with each order.</p>''',
            'variants': [
                {'title': 'Flat Anchor 1.3T Ôø?HDG', 'price': '3.20', 'sku': 'LA-F-1.3T-HDG', 'inventory_quantity': 3000, 'inventory_management': 'shopify'},
                {'title': 'Flat Anchor 2.5T Ôø?HDG', 'price': '5.80', 'sku': 'LA-F-2.5T-HDG', 'inventory_quantity': 3000, 'inventory_management': 'shopify'},
                {'title': 'Loop Anchor 5T Ôø?HDG', 'price': '11.50', 'sku': 'LA-L-5T-HDG', 'inventory_quantity': 2000, 'inventory_management': 'shopify'},
                {'title': 'Loop Anchor 8T Ôø?HDG', 'price': '18.00', 'sku': 'LA-L-8T-HDG', 'inventory_quantity': 1000, 'inventory_management': 'shopify'},
            ],
            'collection': 'embedded-parts'
        },
        {
            'title': 'Concrete Embedded Conduit Sleeve Ôø?Steel & PVC',
            'handle': 'concrete-embedded-conduit-sleeve',
            'vendor': 'JamesBolt',
            'product_type': 'Embedded Parts',
            'tags': 'conduit sleeve, form sleeve, embedded sleeve, pipe sleeve, concrete sleeve',
            'body_html': '''<h3>Concrete Embedded Conduit Sleeve</h3>
<p>Steel and PVC sleeves cast into concrete walls and slabs to create clean penetrations for pipes, conduits, cables, and mechanical services. Available in round and rectangular profiles.</p>
<h4>Specifications</h4>
<table>
<tr><td><strong>Type</strong></td><td>Round / Rectangular / Square</td></tr>
<tr><td><strong>Material</strong></td><td>Galvanized steel / PVC / HDPE</td></tr>
<tr><td><strong>Diameter / Size</strong></td><td>DN25 to DN300 (round); custom rectangular</td></tr>
<tr><td><strong>Wall Thickness</strong></td><td>1.5mm Ôø?3.0mm (steel) / 3mm Ôø?6mm (PVC)</td></tr>
<tr><td><strong>Length</strong></td><td>Cut to wall thickness or custom length</td></tr>
<tr><td><strong>End Type</strong></td><td>Open / Capped / With flange</td></tr>
</table>
<h4>Features</h4>
<ul>
<li>Maintains alignment during concrete pour</li>
<li>Clean penetration Ôø?no coring required after concrete set</li>
<li>Flanged versions prevent pull-through</li>
<li>Custom sizes and shapes available</li>
</ul>
<p><strong>MOQ:</strong> 50 pcs | Custom fabrication available for non-standard sizes.</p>''',
            'variants': [
                {'title': 'DN50 Round Ôø?Galvanized Steel (L=200mm)', 'price': '4.50', 'sku': 'CS-R50-GS-200', 'inventory_quantity': 2000, 'inventory_management': 'shopify'},
                {'title': 'DN100 Round Ôø?Galvanized Steel (L=200mm)', 'price': '7.80', 'sku': 'CS-R100-GS-200', 'inventory_quantity': 2000, 'inventory_management': 'shopify'},
                {'title': 'DN150 Round Ôø?PVC (L=200mm)', 'price': '5.20', 'sku': 'CS-R150-PVC-200', 'inventory_quantity': 1500, 'inventory_management': 'shopify'},
                {'title': 'DN200 Round Ôø?Galvanized Steel (L=200mm)', 'price': '14.00', 'sku': 'CS-R200-GS-200', 'inventory_quantity': 1000, 'inventory_management': 'shopify'},
            ],
            'collection': 'embedded-parts'
        },
    ]

    created = []
    for p in products:
        col_handle = p.pop('collection')
        col_id = collection_ids.get(col_handle)
        payload = {'product': p}
        r = api('POST', '/products.json', payload)
        if r:
            pid = r['product']['id']
            ptitle = r['product']['title']
            print(f'  Ôø?{ptitle} (ID: {pid})')
            # assign to collection
            if col_id:
                api('POST', '/collects.json', {'collect': {'product_id': pid, 'collection_id': col_id}})
            created.append({'id': pid, 'title': ptitle, 'handle': r['product']['handle']})
        time.sleep(0.8)
    return created

def main():
    print('üöÄ JamesBolt Áã¨Á´ãÁ´ôËá™Âä®Âª∫Á´ôÂºÄÔø?..')
    col_ids = create_collections()
    create_pages()
    products = create_products(col_ids)
    print('\n=== Âª∫Á´ôÂÆåÊàêÊ±áÔøΩ?===')
    print(f'Collections: {len(col_ids)}/4')
    print(f'Pages: 4 (About Us / Request a Quote / Technical Resources / Contact)')
    print(f'Products: {len(products)}/5')
    for p in products:
        print(f'  - {p["title"]} Ôø?/products/{p["handle"]}')
    print('\nÔø?ËØ∑ËÆøÔø?https://admin.shopify.com/store/jamesbolt Êü•ÁúãÁªìÊûú')

if __name__ == '__main__':
    main()

