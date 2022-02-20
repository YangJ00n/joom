const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const muteIcon = muteBtn.querySelector("i");
const cameraBtn = document.getElementById("camera");
const cameraIcon = cameraBtn.querySelector("i");
const camerasSelect = document.getElementById("cameras");

const call = document.getElementById("call");
const peerFace = document.getElementById("peerFace");

const NONE_CN = "none";

call.classList.add(NONE_CN);
peerFace.classList.add(NONE_CN);

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let myDataChannel;

const getCameras = async () => {
  try {
    // enumerateDevices() 시스템에서 사용 가능한 미디어 입출력 장치의 정보를 담은 배열을 가져옵니다.
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    const currentCamera = myStream.getVideoTracks()[0];
    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;
      if (currentCamera.label == camera.label) {
        option.selected = true;
      }
      camerasSelect.appendChild(option);
    });
  } catch (e) {
    console.log(e);
  }
};

const getMedia = async (deviceId) => {
  const initialConstrains = {
    audio: true,
    video: { facingMode: "user" },
  };
  const cameraConstrains = {
    audio: true,
    video: { deviceId: { exact: deviceId } },
  };
  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstrains : initialConstrains
    );
    myFace.srcObject = myStream;
    if (!deviceId) {
      await getCameras();
    }
  } catch (e) {
    console.log(e);
  }
};

const handleMuteClick = () => {
  myStream
    .getAudioTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (!muted) {
    muteIcon.className = "fas fa-microphone-slash";
    muted = true;
  } else {
    muteIcon.className = "fas fa-microphone";
    muted = false;
  }
};
const handleCameraClick = () => {
  myStream
    .getVideoTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (cameraOff) {
    cameraIcon.className = "fas fa-video";
    cameraOff = false;
  } else {
    cameraIcon.className = "fas fa-video-slash";
    cameraOff = true;
  }
};

const handleCameraChange = async () => {
  await getMedia(camerasSelect.value);

  if (muted) {
    myStream
      .getAudioTracks()
      .forEach((track) => (track.enabled = !track.enabled));
  }
  if (cameraOff) {
    myStream
      .getVideoTracks()
      .forEach((track) => (track.enabled = !track.enabled));
  }

  if (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    videoSender.replaceTrack(videoTrack);
  }
};

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);

// ⭐️ Welcome Form (join a room)

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

const handleBeforeunload = (event) => {
  event.preventDefault();
  event.returnValue = "";
};

const initCall = async () => {
  welcome.classList.add(NONE_CN);
  call.classList.remove(NONE_CN);
  await getMedia();
  makeConnection();
  window.addEventListener("beforeunload", handleBeforeunload);
};

const handleWelcomeSubmit = async (event) => {
  event.preventDefault();
  const input = welcomeForm.querySelector("input");
  await initCall();
  socket.emit("join_room", input.value);
  roomName = input.value;
  input.value = "";
};

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// ⭐️ Socket Code

socket.on("welcome", async () => {
  // 이 코드는 방 호스트에게만 작동한다. (2명 기준)
  myDataChannel = myPeerConnection.createDataChannel("chat");
  myDataChannel.addEventListener("message", (event) => addMessage(event.data));

  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  socket.emit("offer", offer, roomName);
});

socket.on("offer", async (offer) => {
  // 이 코드는 방 참가자에게만 작동한다. (2명 기준)
  myPeerConnection.addEventListener("datachannel", (event) => {
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message", (event) =>
      addMessage(event.data)
    );
  });

  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
});

socket.on("answer", (answer) => {
  // 이 코드는 방 호스트에게만 작동한다. (2명 기준)
  myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
  myPeerConnection.addIceCandidate(ice);
});

// ⭐️ RTC Code

const makeConnection = () => {
  // 양쪽에서 peer-to-peer connection을 만듦.
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
    ],
  });

  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("addstream", handleAddStream);

  // 그 다음 양쪽에서 카메라와 마이크의 데이터 stream을 받아서 연결안에 집어 넣음.
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
};

const handleIce = (data) => {
  socket.emit("ice", data.candidate, roomName);
};

const handleAddStream = (data) => {
  peerFace.classList.remove(NONE_CN);
  chat.classList.remove(NONE_CN);
  peerFace.srcObject = data.stream;
};

// ⭐️ Chat

const chat = document.getElementById("chat");
const chatForm = chat.querySelector("form");
const chatList = chat.querySelector("ul");

chat.classList.add(NONE_CN);

const addMessage = (msg, isYourMsg = false) => {
  const span = document.createElement("span");
  span.innerText = msg;
  const li = document.createElement("li");
  li.appendChild(span);
  if (isYourMsg) {
    li.className = "chat__youSent";
  }
  chatList.appendChild(li);
};

const handleChatSubmit = (event) => {
  event.preventDefault();
  const input = chatForm.querySelector("input");
  myDataChannel.send(input.value);
  addMessage(input.value, (isYourMsg = true));
  input.value = "";
  chatList.scrollTo(0, chatList.scrollHeight);
};

chatForm.addEventListener("submit", handleChatSubmit);
