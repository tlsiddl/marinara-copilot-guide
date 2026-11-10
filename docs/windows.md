# Windows 설치

마리나라가 실행되는 **컴퓨터와 프록시가 실행되는 컴퓨터가 같은지** 먼저 확인하세요. 다른 서버의 마리나라에 노트북의 `127.0.0.1`을 넣으면 서버 자신의 주소를 가리키므로 연결되지 않습니다.

## A. 마리나라가 Windows의 Docker에서 실행 중인 경우

Windows에서 [Docker Desktop과 WSL 2](https://docs.docker.com/desktop/features/wsl/)를 설치하고 실행합니다. Docker Desktop 이용 조건은 공식 사이트에서 확인하세요. 마리나라 컨테이너가 실행되는 **같은 Docker 엔진**을 사용하는 WSL 2 Ubuntu 터미널에서 [Linux Docker 설치 단계](../README.md#1-마리나라-네트워크-확인)를 진행합니다. Ubuntu에서 `docker version`과 `docker compose version`을 확인하세요. Docker Desktop에서 WSL 통합 설정이 필요할 수 있습니다.

이 경우 주소는 `http://copilot-bridge:3001/v1`이며, 두 컨테이너는 같은 **사용자 정의 Docker 네트워크**에 있어야 합니다. 기본 `bridge` 네트워크에서는 이 이름 해석을 전제로 할 수 없습니다. 마리나라 컨테이너 네트워크 변경은 기존 서비스에 영향을 줄 수 있으니 현재 구성을 확인한 뒤 진행하세요.

## B. 마리나라가 Windows에서 직접 실행 중인 경우

Windows x64에서 마리나라 서버도 같은 Windows PC에서 직접 실행 중일 때의 방법입니다. Windows ARM이나 다른 플랫폼은 실제 환경에서 별도 검증이 필요합니다. 이 경로는 Docker 격리 없이 로컬 프로세스로 실행됩니다. 프록시는 기본적으로 **127.0.0.1에만** 바인딩합니다. PC의 다른 로컬 프로그램도 접근을 시도할 수 있으므로 API 키를 설정합니다. Windows의 다른 사용자나 악성 프로그램에 대해 완벽한 격리를 제공하지 않습니다.

1. [Node.js](https://nodejs.org/) 22 이상, Git과 [PowerShell 6 이상](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli)을 준비합니다. 아래 명령은 PowerShell 7 기준입니다. 관리자 PowerShell로 실행하지 마세요.
2. PowerShell에서 아래를 실행합니다. GitHub 기기 인증 요청과 권한 범위는 직접 확인하고 승인하세요.

```powershell
git clone https://github.com/tlsiddl/marinara-copilot-guide.git
Set-Location marinara-copilot-guide
npm ci
.\node_modules\.bin\copilot.cmd login
```

CLI가 시스템 자격 증명 저장소를 사용할 수 없다면 일반 파일에 토큰을 저장할 수 있습니다. 경고와 권한 범위를 확인하세요. GitHub 토큰은 누구에게도 보내지 마세요.

3. 프록시 API 키로 사용할 **무작위로 만든 32자 이상**의 비밀 문자열을 정하고, 아래 명령을 실행해 화면에 표시하지 않고 입력합니다. 나중에 마리나라에도 이 값을 입력해야 합니다. 이 값은 GitHub 토큰이 아닙니다.

```powershell
$bridgeSecure = Read-Host '프록시 API 키 (32자 이상)' -AsSecureString
$bridgePtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($bridgeSecure)
try {
    $env:COPILOT_PROXY_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bridgePtr)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bridgePtr)
}
if ($env:COPILOT_PROXY_API_KEY.Length -lt 32) { throw 'API 키는 32자 이상이어야 합니다.' }
node index.js --list
node index.js -m auto --session-ttl 0
```

이 PowerShell 창을 열어 두어야 합니다. PC나 창을 다시 시작하면 위의 키 입력과 실행을 다시 해야 합니다. 키는 현재 프로세스의 환경 변수에서 자식 프로세스에 전달됩니다. 프로세스 환경에 접근할 수 있는 다른 프로그램으로부터 완전히 숨겨지는 것은 아닙니다.

4. 마리나라의 OpenAI 호환 연결에 주소 `http://127.0.0.1:3001/v1`과 위에서 정한 프록시 API 키를 넣고 모델을 선택합니다. 마리나라가 로컬 주소를 차단하면 [내부 주소 허용에 대한 주의](../README.md#5-마리나라에서-연결)를 먼저 읽으세요. 무료·유료 사용량과 플랜에 따라 실제 AI 호출은 크레딧을 사용합니다.

5. 중지하려면 프록시 PowerShell 창에서 `Ctrl+C`를 누릅니다. 재시작하려면 프로젝트 폴더로 돌아와 3번을 다시 실행하세요. 포트 충돌은 `node index.js -m auto -p 3002 --session-ttl 0`처럼 다른 포트와 그에 맞는 마리나라 주소를 사용합니다. 자동 실행은 이 가이드에서 설정하지 않습니다.

