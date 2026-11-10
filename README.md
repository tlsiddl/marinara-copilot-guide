# 마리나라에서 GitHub Copilot 연결하기

GitHub Copilot SDK로 동작하는 별도 Docker 프록시를 통해 Marinara Engine에 OpenAI 호환 연결을 추가하는 가이드입니다. 개인 서버에서 직접 사용하도록 구성되어 있습니다. **GitHub가 제공하는 공식 OpenAI API 서버는 아닙니다.**

> 이 프로젝트는 [rezrov/copilot-proxy](https://github.com/rezrov/copilot-proxy)의 MIT 라이선스 코드를 바탕으로 API 키 검증, 텍스트 요청 전용 제한, 스트리밍 ID 수정과 Docker 설정을 추가했습니다. 원 저작권 표시는 `LICENSE`에 있습니다. GitHub가 이 프록시를 보증하지 않습니다.

## 시작하기 전

- Linux 서버, Docker와 Docker Compose, 실행 중인 Marinara Engine이 필요합니다. 아래 예시는 서버 터미널 명령입니다.
- GitHub Copilot 계정이 필요합니다. **모델은 계정 플랜과 GitHub의 현재 제공 목록에 따라 다릅니다.**
- 프록시는 Copilot SDK의 에이전트 세션을 사용하므로, 모든 OpenAI API 기능·프롬프트·토큰 계산이나 RP 품질이 원래 API와 같다고 보장할 수 없습니다. 이미지 입력과 긴 대화는 별도로 검증해야 합니다.
- 구독과 모델 이용에는 GitHub의 약관과 사용량 정책이 적용됩니다. 설치 전 본인의 용도가 허용되는지 확인하세요. 요청은 포함 크레딧을 소모하며, 계정의 추가 사용 설정에 따라 요금이 발생할 수 있습니다. [GitHub 사용량 안내](https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing)
- 공개 포트는 만들지 않습니다. 같은 Docker 네트워크에 있는 컨테이너는 프록시에 접근을 시도할 수 있으므로 키를 비밀로 유지하세요. 마리나라와 같은 네트워크에 신뢰할 수 없는 컨테이너가 있다면 격리하세요.
- 이 구성은 텍스트 요청 위주입니다. 외부 도구 호출을 거절하고, SDK 내장 도구를 허용 목록에서 제외하며 권한 요청을 거부합니다. 프록시 컨테이너는 비루트 사용자로 실행하고 권한 상승과 Linux capabilities를 제한합니다. 그래도 이 설정은 완전한 보안 감사를 대체하지 않습니다.

## 1. 마리나라 네트워크 확인

서버에 저장소를 내려받습니다. 저장소 주소는 GitHub 화면의 **Code → HTTPS**에서 복사하세요.

```sh
git clone <이-저장소의-HTTPS-주소> marinara-copilot
cd marinara-copilot
```

실행 중인 마리나라 컨테이너 이름을 확인합니다.

```sh
docker ps --format 'table {{.Names}}\t{{.Image}}'
```

아래의 `<마리나라-컨테이너>`를 실제 이름으로 바꾸고 실행합니다. 여러 네트워크가 표시되면 마리나라가 사용하는 사용자 정의 Docker 네트워크를 선택하세요.

```sh
docker inspect <마리나라-컨테이너> --format '{{range $name, $network := .NetworkSettings.Networks}}{{$name}}{{"\n"}}{{end}}'
```

## 2. 프록시 설정과 빌드

아래 `<마리나라-네트워크>`를 위에서 확인한 이름으로 바꾸세요. 이 파일에는 접속 비밀번호가 들어가므로 다른 사람에게 보내거나 GitHub에 올리지 마세요.

```sh
umask 077
printf 'MARINARA_NETWORK=%s\n' '<마리나라-네트워크>' > .env
printf 'COPILOT_PROXY_API_KEY=' >> .env
openssl rand -hex 32 >> .env
chmod 600 .env
docker compose build
```

`openssl`이 없다면 시스템 패키지 관리자로 설치하거나 별도 보안 난수 생성 수단을 사용하세요. `.env`는 Git 추적과 Docker 빌드 컨텍스트에서 제외됩니다.

## 3. GitHub 인증

새 볼륨에는 컨테이너 사용자가 접근할 수 있도록 초기 권한이 설정됩니다. 아래 명령으로 인증을 시작합니다.

```sh
docker compose run --rm --no-deps --entrypoint /app/node_modules/.bin/copilot copilot-bridge login
```

화면의 GitHub 기기 인증 주소와 코드를 사용해 **직접** 로그인하고, 요청되는 GitHub 권한을 읽고 승인하세요. 컨테이너에 시스템 키체인이 없으면 CLI가 토큰을 **일반 텍스트 파일**로 저장할지 물을 수 있습니다. 동의하는 경우에만 진행하세요. 토큰은 Docker 볼륨에 보관되며, 서버 관리자나 Docker 권한이 있는 사용자는 접근할 수 있습니다. 이 토큰과 코드를 공개하지 마세요. CLI가 요청하는 저장소 권한 범위도 인증 화면에서 확인하세요.

## 4. 실행과 모델 확인

```sh
docker compose up -d
docker compose ps
docker compose logs --tail 30 copilot-bridge
docker compose run --rm --no-deps --entrypoint node copilot-bridge index.js --list
```

모델 목록은 해당 계정에서 SDK가 현재 조회한 값입니다. 목록에 없는 모델 이름을 임의로 입력해도 사용할 수 있다는 뜻은 아닙니다. 프록시를 실행할 때 기본 모델은 `auto`입니다. 플랜 변경 직후 목록이 오래된 경우 `docker compose restart copilot-bridge` 후 다시 조회하세요.

## 5. 마리나라에서 연결

1. Connections에서 **OpenAI-compatible address** 계정을 추가합니다.
2. 서버 주소로 `http://copilot-bridge:3001/v1`을 입력합니다. 이 주소는 마리나라 **컨테이너 내부**에서 사용하는 주소입니다.
3. API 키에는 `.env`의 `COPILOT_PROXY_API_KEY=` 뒤에 있는 값만 넣습니다. `.env` 파일 전체나 GitHub 로그인 토큰이 아닙니다.
4. 조회된 모델 중 사용할 모델을 추가하고, 짧은 요청과 스트리밍을 시험합니다. 기존 기본 모델을 바꾸는 것은 선택 사항입니다.

마리나라가 사설 주소를 거부한다면 먼저 오류를 확인하세요. 일부 버전은 마리나라의 데이터 `.env`에 `PROVIDER_LOCAL_URLS_ENABLED=true` 설정을 요구합니다. 이 설정은 **이 프록시뿐 아니라 다른 사설·로컬 주소로의 제공자 접근도 허용**합니다. 보안 영향을 이해하고 승인한 뒤에만 설정하세요. 설치 형태에 따라 활성 `.env` 위치와 적용 방식은 다를 수 있으므로 문서와 현재 실행 환경을 먼저 확인하고 기존 설정을 백업하세요. 이 저장소는 마리나라 설정을 자동으로 바꾸지 않습니다.

## 유지보수와 문제 해결

```sh
docker compose logs --tail 50 copilot-bridge
docker compose restart copilot-bridge
docker compose stop
docker compose up -d
```

- **모델 목록·요청 401:** `.env`에 있는 프록시 API 키만 마리나라에 입력했는지 확인합니다. GitHub 토큰과는 다릅니다.
- **사설 주소 차단:** 위의 내부 주소 허용 설명을 확인합니다.
- **로그인 또는 모델 접근 실패:** 기기 인증 상태, 플랜, 모델 제공 여부를 확인합니다. 기기 인증을 다시 하려면 3번 명령을 사용합니다.
- **컨테이너가 재시작을 반복:** 로그를 확인합니다. 지원되지 않는 기본 모델이나 인증 실패일 수 있습니다.
- **API 키 분실·노출:** `.env`의 키를 새 보안 난수로 교체한 뒤 `docker compose up -d`로 컨테이너를 재생성하고 마리나라에도 새 키를 입력하세요. GitHub 인증 토큰은 별도입니다.

컨테이너와 이 프로젝트의 네트워크 연결만 제거하려면 `docker compose down`을 실행합니다. **인증 볼륨은 기본적으로 남습니다.** GitHub 기기 인증을 철회하려면 GitHub 설정의 승인된 OAuth 앱에서도 권한을 검토하세요. 인증 볼륨을 지우면 다시 로그인해야 하므로 이름과 내용을 확인한 뒤 명시적으로 제거하세요. 마리나라 볼륨이나 다른 프로젝트의 데이터는 삭제하지 마세요.

## 개발 및 검증

`npm ci` 후 `node --test test/security.test.mjs`로 인증과 도구 요청 차단을 점검할 수 있습니다. 이 테스트는 GitHub 로그인이나 모델 요청을 하지 않습니다. 실제 모델 응답, 스트리밍, 긴 문맥, 이미지, 특정 사용 목적에 대한 정책 적합성까지 보장하지 않습니다.
