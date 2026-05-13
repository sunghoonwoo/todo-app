from google import genai
import os
import sys

# 1. 인증 설정 (환경 변수 우선순위 정리)
api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    # 혹시 GOOGLE_API_KEY가 없으면 GEMINI_API_KEY를 시도합니다.
    api_key = os.environ.get("GEMINI_API_KEY")

client = genai.Client(api_key=api_key)

# 2. 모델 설정: Pro 구독자의 특권인 3.1 Pro Preview를 사용합니다.
current_model = "gemini-3.1-pro-preview"

def main():
    print(f"--- 🚀 [Gemini 3.1 Pro] 엔진 가동 중 ---")
    
    try:
        # 터미널에서 사용자 입력을 받습니다.
        user_input = input("\n성훈님, 무엇을 도와드릴까요? (종료: exit) : ").strip()
        
        if not user_input or user_input.lower() in ['exit', 'quit', '종료']:
            print("대화를 종료합니다. 즐거운 작업 되세요!")
            return

        # 모델 호출 및 응답 생성
        response = client.models.generate_content(
            model=current_model,
            contents=user_input,
            config={
                'max_output_tokens': 1000, # 너무 긴 답변으로 인한 지연 방지
                'temperature': 0.7         # 창의성과 정확성의 균형
            }
        )
        
        print(f"\n✨ Gemini 3.1의 답변:\n{response.text}")

    except Exception as e:
        if "503" in str(e):
            print("\n📢 [서버 혼잡] 구글 서버에 사용자가 몰리고 있습니다.")
            print("잠시 후(약 30초 뒤) 다시 'gemini'를 입력해 주세요.")
        else:
            print(f"\n❌ 오류 발생: {e}")

if __name__ == "__main__":
    main()
