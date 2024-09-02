// ==UserScript==
// @name         Auto Read
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  自动刷linuxdo文章
// @author       liuweiqing
// @match        https://meta.discourse.org/*
// @match        https://linux.do/*
// @match        https://meta.appinn.net/*
// @match        https://community.openai.com/
// @grant        none
// @license      MIT
// @icon         https://www.google.com/s2/favicons?domain=linux.do
// @downloadURL https://update.greasyfork.org/scripts/489464/Auto%20Read.user.js
// @updateURL https://update.greasyfork.org/scripts/489464/Auto%20Read.meta.js
// ==/UserScript==

(function () {
  ("use strict");
  // 定义可能的基本URL
  const possibleBaseURLs = [
    "https://meta.discourse.org",
    "https://linux.do",
    "https://meta.appinn.net",
    "https://community.openai.com",
  ];
  const commentLimit = 1000;
  const specificUserPostListLimit = 100;
  const likeLimit = 50;
  // 获取当前页面的URL
  const currentURL = window.location.href;
  const specificUser = "14790897";

  // 确定当前页面对应的BASE_URL
  let BASE_URL = possibleBaseURLs.find((url) => currentURL.startsWith(url));

  // 环境变量：阅读网址，如果没有找到匹配的URL，则默认为第一个
  if (!BASE_URL) {
    BASE_URL = possibleBaseURLs[0];
    console.log("默认BASE_URL设置为: " + BASE_URL);
  } else {
    console.log("当前BASE_URL是: " + BASE_URL);
  }

  console.log("脚本正在运行在: " + BASE_URL);
  //1.进入网页 https://linux.do/t/topic/数字（1，2，3，4）
  //2.使滚轮均衡的往下移动模拟刷文章
  // 检查是否是第一次运行脚本
  function checkFirstRun() {
    if (localStorage.getItem("isFirstRun") === null) {
      console.log("脚本第一次运行，执行初始化操作...");
      updateInitialData();
      localStorage.setItem("isFirstRun", "false");
    } else {
      console.log("脚本非第一次运行");
    }
  }

  // 更新初始数据的函数
  function updateInitialData() {
    localStorage.setItem("read", "false"); // 开始时自动滚动关闭
    localStorage.setItem("autoLikeEnabled", "false"); //默认关闭自动点赞
    console.log("执行了初始数据更新操作");
  }
  const delay = 2000; // 滚动检查的间隔（毫秒）
  let scrollInterval = null;
  let checkScrollTimeout = null;
  let autoLikeInterval = null;

  function getLatestTopic() {
    let lastOffset = Number(localStorage.getItem("lastOffset")) || 0;
    let specificUserPostList = [];
    let isDataSufficient = false;

    while (!isDataSufficient) {
      lastOffset++;
      const url = `${BASE_URL}/user_actions.json?offset=${lastOffset}&username=${specificUser}&filter=5`;

      $.ajax({
        url: url,
        async: false,
        success: function (result) {
          if (result && result.user_actions && result.user_actions.length > 0) {
            result.user_actions.forEach((topic) => {
              specificUserPostList.push(`${topic}/${post_number}`);
            });

            // 检查是否已获得足够的 topics
            if (specificUserPostList.length >= specificUserPostListLimit) {
              isDataSufficient = true;
            }
          } else {
            isDataSufficient = true; // 没有更多内容时停止请求
          }
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
          console.error(XMLHttpRequest, textStatus, errorThrown);
          isDataSufficient = true; // 遇到错误时也停止请求
        },
      });
    }

    if (specificUserPostList.length > specificUserPostListLimit) {
      specificUserPostList = specificUserPostList.slice(
        0,
        specificUserPostListLimit
      );
    }

    localStorage.setItem("lastOffset", lastOffset);
    localStorage.setItem(
      "specificUserPostList",
      JSON.stringify(specificUserPostList)
    );
  }

  function openSpecificUserPost() {
    let specificUserPostListStr = localStorage.getItem("specificUserPostList");
    let specificUserPostList = specificUserPostListStr
      ? JSON.parse(specificUserPostListStr)
      : [];

    // 如果列表为空，则获取最新文章
    if (specificUserPostList.length === 0) {
      getLatestTopic();
      specificUserPostListStr = localStorage.getItem("specificUserPostList");
      specificUserPostList = specificUserPostListStr
        ? JSON.parse(specificUserPostListStr)
        : [];
    }

    // 如果获取到新文章，打开第一个
    if (specificUserPostList.length > 0) {
      const topic = specificUserPostList.shift();
      localStorage.setItem(
        "specificUserPostList",
        JSON.stringify(specificUserPostList)
      );
      window.location.href = `${BASE_URL}/t/topic/${topic.id}`;
    }
  }

  // 检查是否点赞
  function likePostAndGoNext() {
    const postId = data.post_id;

    const targetId = `discourse-reactions-counter-${postId}-right`;

    const element = document.getElementById(targetId);

    if (element) {
      const reactionButton = parentElement.querySelector(
        ".discourse-reactions-reaction-button"
      );

      if (
        (reactionButton.title !== "点赞此帖子" &&
          reactionButton.title !== "Like this post") ||
        clickCounter >= likeLimit
      ) {
        return;
      }
      triggerClick(reactionButton);
      clickCounter++;
      console.log(`Clicked like button ${clickCounter}`);
      localStorage.setItem("clickCounter", clickCounter.toString());
      // 如果点击次数达到likeLimit次，则设置点赞变量为false
      if (clickCounter === likeLimit) {
        console.log(
          `Reached ${likeLimit} likes, setting the like variable to false.`
        );
        localStorage.setItem("autoLikeEnabled", "false");
      } else {
        console.log("clickCounter:", clickCounter);
      }
    } else {
      console.log("未找到对应的元素。");
    }
    console.log("已点赞用户：");
    openSpecificUserPost();
  }

  // 入口函数
  window.addEventListener("load", () => {
    checkFirstRun();
    console.log(
      "autoRead",
      localStorage.getItem("read"),
      "autoLikeEnabled",
      localStorage.getItem("autoLikeEnabled")
    );
    if (localStorage.getItem("read") === "true") {
      console.log("执行正常的滚动和检查逻辑");
      likePostAndGoNext();
      if (isAutoLikeEnabled()) {
        autoLike();
      }
    }
  });

  // 获取当前时间戳
  const currentTime = Date.now();
  // 获取存储的时间戳
  const defaultTimestamp = new Date("1999-01-01T00:00:00Z").getTime(); //默认值为1999年
  const storedTime = parseInt(
    localStorage.getItem("clickCounterTimestamp") ||
      defaultTimestamp.toString(),
    10
  );

  // 获取当前的点击计数，如果不存在则初始化为0
  let clickCounter = parseInt(localStorage.getItem("clickCounter") || "0", 10);
  // 检查是否超过24小时（24小时 = 24 * 60 * 60 * 1000 毫秒）
  if (currentTime - storedTime > 24 * 60 * 60 * 1000) {
    // 超过24小时，清空点击计数器并更新时间戳
    clickCounter = 0;
    localStorage.setItem("clickCounter", "0");
    localStorage.setItem("clickCounterTimestamp", currentTime.toString());
  }

  console.log(`Initial clickCounter: ${clickCounter}`);
  function triggerClick(button) {
    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    button.dispatchEvent(event);
  }

  function autoLike() {
    console.log(`Initial clickCounter: ${clickCounter}`);
    const buttons = document.querySelectorAll(
      ".discourse-reactions-reaction-button"
    );
    if (buttons.length === 0) {
      console.error(
        "No buttons found with the selector '.discourse-reactions-reaction-button'"
      );
      return;
    }
    console.log(`Found ${buttons.length} buttons.`); // 调试信息

    // 逐个点击找到的按钮
    buttons.forEach((button, index) => {
      if (
        (button.title !== "点赞此帖子" && button.title !== "Like this post") ||
        clickCounter >= likeLimit
      ) {
        return;
      }

      // 使用setTimeout来错开每次点击的时间，避免同时触发点击
      autoLikeInterval = setTimeout(() => {
        // 模拟点击
        triggerClick(button); // 使用自定义的触发点击方法
        console.log(`Clicked like button ${index + 1}`);
        clickCounter++; // 更新点击计数器
        // 将新的点击计数存储到localStorage
        localStorage.setItem("clickCounter", clickCounter.toString());
        // 如果点击次数达到likeLimit次，则设置点赞变量为false
        if (clickCounter === likeLimit) {
          console.log(
            `Reached ${likeLimit} likes, setting the like variable to false.`
          );
          localStorage.setItem("autoLikeEnabled", "false"); // 使用localStorage存储点赞变量状态
        } else {
          console.log("clickCounter:", clickCounter);
        }
      }, index * 1000); // 这里的1000毫秒是两次点击之间的间隔，可以根据需要调整
    });
  }
  const button = document.createElement("button");
  // 初始化按钮文本基于当前的阅读状态
  button.textContent =
    localStorage.getItem("read") === "true" ? "停止阅读" : "开始阅读";
  button.style.position = "fixed";
  button.style.bottom = "10px"; // 之前是 top
  button.style.left = "10px"; // 之前是 right
  button.style.zIndex = 1000;
  button.style.backgroundColor = "#f0f0f0"; // 浅灰色背景
  button.style.color = "#000"; // 黑色文本
  button.style.border = "1px solid #ddd"; // 浅灰色边框
  button.style.padding = "5px 10px"; // 内边距
  button.style.borderRadius = "5px"; // 圆角
  document.body.appendChild(button);

  button.onclick = function () {
    const currentlyReading = localStorage.getItem("read") === "true";
    const newReadState = !currentlyReading;
    localStorage.setItem("read", newReadState.toString());
    button.textContent = newReadState ? "停止阅读" : "开始阅读";
    if (!newReadState) {
      if (scrollInterval !== null) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }
      if (checkScrollTimeout !== null) {
        clearTimeout(checkScrollTimeout);
        checkScrollTimeout = null;
      }
      localStorage.removeItem("navigatingToNextTopic");
    } else {
      // 如果是Linuxdo，就导航到我的帖子
      if (BASE_URL == "https://linux.do") {
        window.location.href = "https://linux.do/t/topic/13716/427";
      } else {
        window.location.href = `${BASE_URL}/t/topic/1`;
      }
      likePostAndGoNext();
    }
  };

  //自动点赞按钮
  // 在页面上添加一个控制自动点赞的按钮
  const toggleAutoLikeButton = document.createElement("button");
  toggleAutoLikeButton.textContent = isAutoLikeEnabled()
    ? "禁用自动点赞"
    : "启用自动点赞";
  toggleAutoLikeButton.style.position = "fixed";
  toggleAutoLikeButton.style.bottom = "50px"; // 之前是 top，且与另一个按钮错开位置
  toggleAutoLikeButton.style.left = "10px"; // 之前是 right
  toggleAutoLikeButton.style.zIndex = "1000";
  toggleAutoLikeButton.style.backgroundColor = "#f0f0f0"; // 浅灰色背景
  toggleAutoLikeButton.style.color = "#000"; // 黑色文本
  toggleAutoLikeButton.style.border = "1px solid #ddd"; // 浅灰色边框
  toggleAutoLikeButton.style.padding = "5px 10px"; // 内边距
  toggleAutoLikeButton.style.borderRadius = "5px"; // 圆角
  document.body.appendChild(toggleAutoLikeButton);

  // 为按钮添加点击事件处理函数
  toggleAutoLikeButton.addEventListener("click", () => {
    const isEnabled = !isAutoLikeEnabled();
    setAutoLikeEnabled(isEnabled);
    toggleAutoLikeButton.textContent = isEnabled
      ? "禁用自动点赞"
      : "启用自动点赞";
  });
  // 判断是否启用自动点赞
  function isAutoLikeEnabled() {
    // 从localStorage获取autoLikeEnabled的值，如果未设置，默认为"true"
    return localStorage.getItem("autoLikeEnabled") !== "false";
  }

  // 设置自动点赞的启用状态
  function setAutoLikeEnabled(enabled) {
    localStorage.setItem("autoLikeEnabled", enabled ? "true" : "false");
  }
})();