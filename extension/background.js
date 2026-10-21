async function configurePanel() {
  try {
    await chrome.sidePanel.setPanelBehavior({openPanelOnActionClick: true});
  } catch (error) {
    console.error('Unable to configure the Inbox Rescue side panel:', error);
  }
}
chrome.runtime.onInstalled.addListener(configurePanel);
chrome.runtime.onStartup.addListener(configurePanel);
configurePanel();
