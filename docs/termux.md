# Termux / Android 설치 (실험적)

**실기기 미검증 경로입니다.** 현재 GitHub Copilot CLI의 네이티브 바이너리는 Android/Termux에서 바로 실행되지 않을 수 있습니다. [CLI의 Termux 지원 이슈](https://github.com/github/copilot-cli/issues/3333)도 확인하세요. 아래는 안드로이드의 Termux 안에 glibc 기반 Ubuntu를 사용하는 **시도 방법**이며, 기기·안드로이드 정책·CLI 버전에 따라 실패할 수 있습니다. 실패하면 이 경로를 억지로 우회하지 말고 일반 Linux 서버나 Windows에서 프록시를 실행하는 방법을 사용하세요.

아래는 **64비트 ARM Android 기기**에서 마리나라 서버와 프록시가 같은 기기에서 실행되는 경우만 다룹니다. 다른 서버의 마리나라에는 `127.0.0.1`을 사용할 수 없습니다. 스마트폰에 서버를 공개하지 마세요. Android는 백그라운드 프로세스를 종료할 수 있고, 저장소·메모리 여유가 필요합니다. PRoot는 보안 컨테이너가 아니며 일반 Docker와 같은 격리나 자동 재시작을 제공하지 않습니다.

## 1. Ubuntu 환경 만들기

[Termux와 PRoot-Distro](https://github.com/termux/proot-distro)의 공식 설치 안내를 따릅니다. 기존 Ubuntu 환경이 있으면 새로 만들지 말고 현 상태를 확인하세요. 아래의 `install ubuntu`는 새 설치용입니다.

```sh
pkg update
pkg install proot-distro
proot-distro install ubuntu
proot-distro login ubuntu --isolated
```

이제 명령은 Ubuntu 환경 **안에서** 실행합니다. 이 환경의 root는 Android의 실제 root 권한은 아니지만 PRoot는 강력한 격리를 보장하지 않습니다. 민감한 파일에 접근 가능한 기기에서 출처를 확인하지 않은 코드를 실행하지 마세요.

```sh
apt update
apt install -y ca-certificates curl git xz-utils libstdc++6
uname -m
```

`uname -m`이 `aarch64`인지 확인하세요. 다음 명령은 공식 Node.js 24 Linux ARM64 배포본과 해당 SHA-256 목록을 HTTPS로 받아 확인한 뒤 Ubuntu 환경에 설치합니다. 설치 대상은 이 PRoot Ubuntu 환경의 `/usr/local`입니다.

```sh
cd /tmp
curl -fsSLO https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt
NODE_ARCHIVE=$(awk '$2 ~ /-linux-arm64\.tar\.xz$/ {print $2}' SHASUMS256.txt)
[ -n "$NODE_ARCHIVE" ] || { echo 'ARM64 Node 배포본을 찾지 못했습니다'; exit 1; }
curl -fsSLO "https://nodejs.org/dist/latest-v24.x/$NODE_ARCHIVE"
grep -F "  $NODE_ARCHIVE" SHASUMS256.txt | sha256sum -c - || { echo '무결성 확인 실패'; exit 1; }
tar -xJf "$NODE_ARCHIVE" -C /usr/local --strip-components=1
node --version
npm --version
```

## 2. 설치와 GitHub 인증

```sh
cd "$HOME"
git clone https://github.com/tlsiddl/marinara-copilot-guide.git
cd marinara-copilot-guide
npm ci
./node_modules/.bin/copilot login
```

화면에 표시된 기기 인증을 직접 승인하고 요청되는 권한을 확인하세요. 시스템 보안 저장소가 없으면 CLI가 GitHub 토큰을 일반 파일로 저장할 수 있습니다. PRoot 환경에 접근할 수 있는 다른 프로세스도 이를 읽을 가능성이 있으므로, 이 저장 방식에 동의하는 경우에만 진행하세요.

## 3. 프록시 실행

무작위로 만든 32자 이상의 비밀 API 키를 정해 숨겨진 입력에 넣습니다. 마리나라 연결에도 같은 값을 사용합니다. 이 키는 GitHub 토큰과 다릅니다.

```bash
read -r -s -p '프록시 API 키 (32자 이상): ' COPILOT_PROXY_API_KEY; echo
export COPILOT_PROXY_API_KEY
[ "${#COPILOT_PROXY_API_KEY}" -ge 32 ] || { echo '키가 너무 짧습니다'; unset COPILOT_PROXY_API_KEY; }
[ -n "$COPILOT_PROXY_API_KEY" ] && node index.js --list
[ -n "$COPILOT_PROXY_API_KEY" ] && node index.js -m auto --session-ttl 0
```

마리나라의 OpenAI 호환 주소에 `http://127.0.0.1:3001/v1`을 넣고 위에서 정한 프록시 키와 조회된 모델을 선택합니다. 마리나라가 로컬 주소를 차단하면 [내부 주소 허용 주의](../README.md#5-마리나라에서-연결)를 먼저 확인하세요. AI 요청에는 Copilot 크레딧이 사용됩니다.

터미널에서 `Ctrl+C`를 누르면 중지됩니다. 기기를 재시작하거나 Termux 프로세스가 종료되면 Ubuntu에 다시 로그인하고 3번을 다시 실행해야 합니다. 자동 실행이나 장시간 안정성은 검증되지 않았습니다. 오류가 나면 GitHub 토큰과 프록시 키를 지운 로그만 공유하세요.
