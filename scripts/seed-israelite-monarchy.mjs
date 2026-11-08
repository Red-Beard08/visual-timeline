import fs from "node:fs";
import path from "node:path";

const vault = process.argv[2];
if (!vault) throw new Error("Usage: node scripts/seed-israelite-monarchy.mjs <vault>");
const folder = path.join(vault, "Collections", "Visual Timeline", "Records");
fs.mkdirSync(folder, { recursive: true });

const overview = [
  ["VTL-KINGDOM-UNITED", "United Kingdom of Israel", "visual-timeline-kingdom", "1050 BC", "930 BC", ["kingdoms"], ["kingdom", "united-monarchy"]],
  ["VTL-KINGDOM-NORTH", "Kingdom of Israel (Northern Kingdom)", "visual-timeline-kingdom", "930 BC", "722 BC", ["kingdoms"], ["kingdom", "northern-kingdom"]],
  ["VTL-KINGDOM-JUDAH", "Kingdom of Judah", "visual-timeline-kingdom", "930 BC", "586 BC", ["kingdoms"], ["kingdom", "southern-kingdom"]],
  ["VTL-ERA-EXILE", "Assyrian and Babylonian Exiles", "visual-timeline-era", "722 BC", "539 BC", ["kingdoms", "eras"], ["era", "exile"]],
];

const kings = [
  ["SAUL", "Saul", "1050 BC", "1010 BC", "united", "VTL-KINGDOM-UNITED", "1 Samuel 9–31"],
  ["DAVID", "David", "1010 BC", "970 BC", "united", "VTL-KINGDOM-UNITED", "2 Samuel; 1 Kings 1–2"],
  ["SOLOMON", "Solomon", "970 BC", "930 BC", "united", "VTL-KINGDOM-UNITED", "1 Kings 1–11"],
  ["REHOBOAM", "Rehoboam", "930 BC", "913 BC", "judah", "VTL-KINGDOM-JUDAH", "1 Kings 12–14"],
  ["ABIJAH", "Abijah", "913 BC", "911 BC", "judah", "VTL-KINGDOM-JUDAH", "1 Kings 15:1–8"],
  ["ASA", "Asa", "911 BC", "870 BC", "judah", "VTL-KINGDOM-JUDAH", "1 Kings 15:9–24"],
  ["JEHOSHAPHAT", "Jehoshaphat", "870 BC", "848 BC", "judah", "VTL-KINGDOM-JUDAH", "1 Kings 22:41–50"],
  ["JEHORAM-JUDAH", "Jehoram of Judah", "848 BC", "841 BC", "judah", "VTL-KINGDOM-JUDAH", "2 Kings 8:16–24"],
  ["AHAZIAH-JUDAH", "Ahaziah of Judah", "841 BC", "841 BC", "judah", "VTL-KINGDOM-JUDAH", "2 Kings 8:25–29"],
  ["ATHALIAH", "Athaliah", "841 BC", "835 BC", "judah", "VTL-KINGDOM-JUDAH", "2 Kings 11"],
  ["JOASH-JUDAH", "Joash of Judah", "835 BC", "796 BC", "judah", "VTL-KINGDOM-JUDAH", "2 Kings 12"],
  ["AMAZIAH", "Amaziah", "796 BC", "767 BC", "judah", "VTL-KINGDOM-JUDAH", "2 Kings 14:1–22"],
  ["UZZIAH", "Uzziah", "767 BC", "740 BC", "judah", "VTL-KINGDOM-JUDAH", "2 Kings 15:1–7"],
  ["JOTHAM", "Jotham", "740 BC", "732 BC", "judah", "VTL-KINGDOM-JUDAH", "2 Kings 15:32–38"],
  ["AHAZ", "Ahaz", "732 BC", "716 BC", "judah", "VTL-KINGDOM-JUDAH", "2 Kings 16"],
  ["HEZEKIAH", "Hezekiah", "716 BC", "687 BC", "judah", "VTL-KINGDOM-JUDAH", "2 Kings 18–20"],
  ["MANASSEH", "Manasseh", "687 BC", "642 BC", "judah", "VTL-KINGDOM-JUDAH", "2 Kings 21:1–18"],
  ["AMON", "Amon", "642 BC", "640 BC", "judah", "VTL-KINGDOM-JUDAH", "2 Kings 21:19–26"],
  ["JOSIAH", "Josiah", "640 BC", "609 BC", "judah", "VTL-KINGDOM-JUDAH", "2 Kings 22–23"],
  ["JEHOAHAZ", "Jehoahaz", "609 BC", "609 BC", "judah", "VTL-KINGDOM-JUDAH", "2 Kings 23:31–34"],
  ["JEHOIAKIM", "Jehoiakim", "609 BC", "598 BC", "judah", "VTL-KINGDOM-JUDAH", "2 Kings 23:34–24:6"],
  ["JEHOIACHIN", "Jehoiachin", "598 BC", "597 BC", "judah", "VTL-KINGDOM-JUDAH", "2 Kings 24:6–17"],
  ["ZEDEKIAH", "Zedekiah", "597 BC", "586 BC", "judah", "VTL-KINGDOM-JUDAH", "2 Kings 24:17–25:7"],
  ["JEROBOAM-I", "Jeroboam I", "930 BC", "910 BC", "north", "VTL-KINGDOM-NORTH", "1 Kings 11:26–14:20"],
  ["NADAB", "Nadab", "910 BC", "909 BC", "north", "VTL-KINGDOM-NORTH", "1 Kings 15:25–31"],
  ["BAASHA", "Baasha", "909 BC", "886 BC", "north", "VTL-KINGDOM-NORTH", "1 Kings 15:32–16:7"],
  ["ELAH", "Elah", "886 BC", "885 BC", "north", "VTL-KINGDOM-NORTH", "1 Kings 16:8–14"],
  ["ZIMRI", "Zimri", "885 BC", "885 BC", "north", "VTL-KINGDOM-NORTH", "1 Kings 16:15–20"],
  ["OMRI", "Omri", "885 BC", "874 BC", "north", "VTL-KINGDOM-NORTH", "1 Kings 16:21–28"],
  ["AHAB", "Ahab", "874 BC", "853 BC", "north", "VTL-KINGDOM-NORTH", "1 Kings 16:29–22:40"],
  ["AHAZIAH-NORTH", "Ahaziah of Israel", "853 BC", "852 BC", "north", "VTL-KINGDOM-NORTH", "1 Kings 22:51–2 Kings 1"],
  ["JEHORAM-NORTH", "Joram of Israel", "852 BC", "841 BC", "north", "VTL-KINGDOM-NORTH", "2 Kings 3–9"],
  ["JEHU", "Jehu", "841 BC", "814 BC", "north", "VTL-KINGDOM-NORTH", "2 Kings 9–10"],
  ["JEHOAHAZ-NORTH", "Jehoahaz of Israel", "814 BC", "798 BC", "north", "VTL-KINGDOM-NORTH", "2 Kings 13:1–9"],
  ["JOASH-NORTH", "Joash of Israel", "798 BC", "782 BC", "north", "VTL-KINGDOM-NORTH", "2 Kings 13:10–14:16"],
  ["JEROBOAM-II", "Jeroboam II", "793 BC", "753 BC", "north", "VTL-KINGDOM-NORTH", "2 Kings 14:23–29"],
  ["ZECHARIAH", "Zechariah", "753 BC", "753 BC", "north", "VTL-KINGDOM-NORTH", "2 Kings 15:8–12"],
  ["SHALLUM", "Shallum", "752 BC", "752 BC", "north", "VTL-KINGDOM-NORTH", "2 Kings 15:13–16"],
  ["MENAHEM", "Menahem", "752 BC", "742 BC", "north", "VTL-KINGDOM-NORTH", "2 Kings 15:17–22"],
  ["PEKAHIAH", "Pekahiah", "742 BC", "740 BC", "north", "VTL-KINGDOM-NORTH", "2 Kings 15:23–26"],
  ["PEKAH", "Pekah", "752 BC", "732 BC", "north", "VTL-KINGDOM-NORTH", "2 Kings 15:27–31"],
  ["HOSHEA", "Hoshea", "732 BC", "722 BC", "north", "VTL-KINGDOM-NORTH", "2 Kings 17"],
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const wiki = (id) => `[[${id}]]`;
const make = (id, title, type, start, end, layers, categories, body, relations) => {
  const rel = (key) => (relations[key] || []).map((value) => JSON.stringify(wiki(value)));
  const lines = [
    "---", `type: ${type}`, "schema_version: 1", `timeline_id: ${id}`, `title: ${title}`,
    "status: active", "tags:", "  - timeline", "  - biblical-history", ...categories.map((x) => `  - ${x}`),
    "layers:", ...layers.map((x) => `  - ${x}`), "categories:", ...categories.map((x) => `  - ${x}`),
    "locations: []", "entities: []", "date:", `  start: \"${start}\"`, `  end: \"${end}\"`, "  precision: year", "  circa: true", `  display: \"${start} – ${end}\"`,
    "relations:",
    ...["continued_from", "split_into", "merged_into", "preceded_by", "succeeded_by", "related_to", "contemporary_with"].map((k) => `${k}: [${rel(k).join(", ")}]`),
    "---", "", `# ${title}`, "", body, "",
  ];
  return lines.join("\n");
};

for (const [id, title, type, start, end, layers, categories] of overview) {
  const body = `This is an explicit historical stream for the Visual Timeline test dataset.\n\nDates are approximate and use the BC schema. The stream is intentionally separate from individual monarch records.`;
  const relations = id === "VTL-KINGDOM-UNITED" ? { succeeded_by: ["VTL-KINGDOM-NORTH", "VTL-KINGDOM-JUDAH"] } : id === "VTL-KINGDOM-NORTH" ? { preceded_by: ["VTL-KINGDOM-UNITED"], related_to: ["VTL-ERA-EXILE"] } : id === "VTL-KINGDOM-JUDAH" ? { preceded_by: ["VTL-KINGDOM-UNITED"], related_to: ["VTL-ERA-EXILE"] } : { related_to: ["VTL-KINGDOM-NORTH", "VTL-KINGDOM-JUDAH"] };
  fs.writeFileSync(path.join(folder, `${id} - ${slug(title)}.md`), make(id, title, type, start, end, layers, categories, body, relations), "utf8");
}

for (let i = 0; i < kings.length; i++) {
  const [suffix, title, start, end, stream, kingdom, source] = kings[i];
  const id = `VTL-KING-${suffix}`;
  const previous = i ? `VTL-KING-${kings[i - 1][0]}` : null;
  const next = i < kings.length - 1 ? `VTL-KING-${kings[i + 1][0]}` : null;
  const relations = { related_to: [kingdom] };
  if (previous && kings[i - 1][4] === stream) relations.preceded_by = [previous];
  if (next && kings[i + 1][4] === stream) relations.succeeded_by = [next];
  const body = `Approximate reign for the Visual Timeline test mapping.\n\nPrimary biblical reference: ${source}.\n\nThis record is a person-level monarchy entry and is explicitly linked to the ${stream === "united" ? "united monarchy" : stream === "north" ? "northern kingdom" : "kingdom of Judah"} stream.`;
  fs.writeFileSync(path.join(folder, `${id} - ${slug(title)}.md`), make(id, title, "visual-timeline-person", start, end, ["people", stream === "united" ? "kingdoms" : stream], ["monarch", stream], body, relations), "utf8");
}

const exile = [
  ["VTL-EVENT-ASSYRIAN-EXILE", "Assyrian conquest and exile of the Northern Kingdom", "722 BC", "722 BC", ["VTL-KINGDOM-NORTH", "VTL-ERA-EXILE"]],
  ["VTL-EVENT-BABYLONIAN-EXILE", "Babylonian conquest and exile of Judah", "586 BC", "586 BC", ["VTL-KINGDOM-JUDAH", "VTL-ERA-EXILE"]],
];
for (const [id, title, start, end, related] of exile) {
  const body = "A terminal event in the test mapping. The exile is represented as an event so it can be filtered separately from the kingdom and monarch streams.";
  fs.writeFileSync(path.join(folder, `${id} - ${slug(title)}.md`), make(id, title, "visual-timeline-event", start, end, ["events", "kingdoms"], ["exile", "conquest"], body, { related_to: related }), "utf8");
}

console.log(`Seeded ${overview.length + kings.length + exile.length} Visual Timeline records in ${folder}`);
