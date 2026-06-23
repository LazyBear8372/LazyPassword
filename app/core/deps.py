"""공용 FastAPI 의존성."""

from fastapi import HTTPException, Request, status


def get_current_user_id(request: Request) -> int:
    """세션에서 로그인된 사용자 id를 반환한다. 없으면 401.

    세션 쿠키의 서명 검증은 SessionMiddleware가 이미 처리하므로,
    여기서는 user_id 존재 여부만 확인한다.
    """
    user_id = request.session.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="로그인이 필요합니다.")
    return user_id
