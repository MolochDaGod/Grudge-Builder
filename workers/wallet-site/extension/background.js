chrome.action.onClicked.addListener(() => {
  chrome.windows.create({
    url: "https://wallet.grudge-studio.com/",
    type: "popup",
    width: 420,
    height: 780,
    focused: true,
  });
});
