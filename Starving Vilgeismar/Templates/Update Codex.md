---
created: 2026-05-07T21:35
updated: 2026-05-08T00:24
---
<%*
new Notice("🔄 Update in progress...", 5000);

try {
    await requestUrl({
        url: 'https://wikiupdate.dnd.box.ca/hooks/middleman?source=Obsidian',
        method: 'GET'
    });

    new Notice("✅ Webhook sent!");
} catch (e) {
    new Notice("❌ Error: " + e);
}
%>



