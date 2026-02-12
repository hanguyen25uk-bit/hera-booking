export const SERVICE_TEMPLATES = {
  industry: "nail-salon",
  name: "Nail Salon Starter Pack",
  description: "30 popular nail services across 4 categories",
  categories: [
    {
      name: "BIAB- Builder Gel",
      services: [
        { name: "BIAB Builder Gel with Complex Nail Art", duration: 80, price: 60, description: "Full BIAB application with complex nail art design" },
        { name: "BIAB Builder gel with simple nail art", duration: 60, price: 50, description: "Full BIAB application with simple nail art" },
        { name: "Infill BIAB with french tips", duration: 45, price: 40, description: "BIAB infill with classic french tip design" },
        { name: "Removal Acrylics & Redo BIAB", duration: 45, price: 45, description: "Safe removal of acrylics followed by full BIAB application. Includes 10 min buffer" },
        { name: "Removal Gel/Shellac & Redo BIAB", duration: 45, price: 45, description: "Removal of gel/shellac followed by full BIAB application. Includes 10 min buffer" },
        { name: "Removal BIAB & Redo BIAB", duration: 45, price: 45, description: "Removal of existing BIAB and fresh application" },
        { name: "Builder Gel on Natural Nails with shellac/gel", duration: 45, price: 40, description: "Builder gel overlay on natural nails with shellac/gel finish. Includes 5 min buffer" },
        { name: "Infill Builder Gel with Shellac/Gel", duration: 45, price: 35, description: "Builder gel infill with shellac/gel colour. Includes 5 min buffer" },
        { name: "Manicure & Builder Gel", duration: 60, price: 48, description: "Full manicure with builder gel application. Includes 5 min buffer" },
        { name: "French Builder Gel on Natural Nails", duration: 45, price: 45, description: "Builder gel with french tip design on natural nails. Includes 5 min buffer" },
        { name: "Builder Gel with Extension with shellac/gel", duration: 45, price: 45, description: "Builder gel extensions with shellac/gel finish. Includes 5 min buffer" },
      ],
    },
    {
      name: "Manicure, Pedicure",
      services: [
        { name: "Normal Pedicure", duration: 45, price: 30, description: "Classic pedicure with nail shaping, cuticle care, and polish. Includes 5 min buffer" },
        { name: "French Shellac Pedicure", duration: 45, price: 43, description: "Pedicure with french shellac finish. Includes 5 min buffer" },
        { name: "French Shellac Manicure", duration: 45, price: 35, description: "Manicure with french shellac finish. Includes 5 min buffer" },
        { name: "Shellac Mani & Pedi", duration: 90, price: 65, description: "Combined shellac manicure and pedicure package. Includes 5 min buffer" },
        { name: "Shellac/Gel Manicure", duration: 30, price: 30, description: "Quick manicure with shellac or gel polish" },
        { name: "Shellac/Gel Pedicure", duration: 60, price: 38, description: "Pedicure with shellac or gel polish finish" },
      ],
    },
    {
      name: "Shellac/ Gel",
      services: [
        { name: "French Shellac Toes", duration: 30, price: 33, description: "French shellac application on toes. Includes 5 min buffer" },
        { name: "French Shellac Hands", duration: 40, price: 28, description: "French shellac application on hands" },
        { name: "Shellac/Gel Toes", duration: 30, price: 28, description: "Shellac or gel polish on toes. Includes 5 min buffer" },
        { name: "Removal & Redo Shellac/Gel Hands", duration: 30, price: 28, description: "Remove old shellac/gel and apply fresh coat. Includes 5 min buffer" },
        { name: "Shellac/Gel Hands", duration: 30, price: 23, description: "Shellac or gel polish on hands. Includes 5 min buffer" },
      ],
    },
    {
      name: "Nail Extensions (with Shellac/Gel)",
      services: [
        { name: "A fullset acrylic with complex nail art", duration: 90, price: 70, description: "Full set of acrylic extensions with intricate nail art design" },
        { name: "Infill Acrylic with French Tips", duration: 45, price: 35, description: "Acrylic infill with classic french tips" },
        { name: "Infill Acrylic Powder (with Shellac/Gel)", duration: 30, price: 30, description: "Acrylic powder infill with shellac/gel finish. Includes 5 min buffer" },
        { name: "SNS Dipping Powder Overlay (Natural Nails)", duration: 45, price: 35, description: "SNS dipping powder on natural nails. Includes 5 min buffer" },
        { name: "Ombre Nail Extensions", duration: 60, price: 42, description: "Nail extensions with ombre colour gradient. Includes 5 min buffer" },
        { name: "Removal & Redo New Set Acrylic Nail Extensions", duration: 75, price: 43, description: "Full removal and fresh set of acrylic extensions. Includes 5 min buffer" },
        { name: "Acrylic Nail Extensions with French Tips", duration: 60, price: 43, description: "Acrylic nail extensions with french tip design. Includes 5 min buffer" },
        { name: "Acrylic Powder Nail Extensions with shellac/gel", duration: 60, price: 38, description: "Acrylic powder extensions finished with shellac/gel. Includes 5 min buffer" },
      ],
    },
  ],
};

// Export type for use in components
export type ServiceTemplate = typeof SERVICE_TEMPLATES;
