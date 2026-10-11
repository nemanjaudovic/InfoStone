import os
import sys

# Ensure Python can resolve modules in the root directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from ai.services.discovery_service import run_discovery_service


def run_discovery_test_case(case_num: int, category: str, user_prompt: str, top_k: int = 3):
    print("\n" + "=" * 60)
    print(f"TEST CASE {case_num}: [{category.upper()}]")
    print(f"PROMPT: '{user_prompt}'")
    print("=" * 60)

    try:
        result = run_discovery_service(user_prompt=user_prompt, top_k=top_k, max_results=15)

        total_found = result.get("total_found", 0)
        matches = result.get("matches", [])

        print(f"\nStatus: Success | Total Ranked Matches Returned: {total_found}/{top_k}")

        if not matches:
            print("⚠️ No suitable matches extracted by Gemma.")
            if "error" in result:
                print(f"Error details: {result['error']}")
            return

        for idx, match in enumerate(matches, 1):
            print(f"\n  [{idx}] {match.get('title')}")
            print(f"      Domain/Location: {match.get('location_or_domain')}")
            print(f"      Match Score:    {match.get('match_score')}/100")
            print(f"      URL:            {match.get('url')}")
            print(f"      Summary:        {match.get('summary')}")
            print(f"      Key Details:    {', '.join(match.get('key_details', []))}")

    except Exception as e:
        print(f"❌ Failed test case {case_num}: {e}")


def test_real_world_workflows():
    print("=== STARTING INFOSTONE REAL-WORLD DISCOVERY WORKFLOW TESTS ===")

    # 1. VENUE DISCOVERY WORKFLOW
    run_discovery_test_case(
        case_num=1,
        category="Venues",
        user_prompt="Tražim prostor za konferenciju ili hakatona u Beogradu za oko 150 do 200 ljudi sa binom i projektorom.",
        top_k=3
    )

    # 2. SPONSOR DISCOVERY WORKFLOW
    run_discovery_test_case(
        case_num=2,
        category="Sponsors",
        user_prompt="Find tech companies and AI startups in Serbia that actively sponsor hackathons or software engineering meetups.",
        top_k=3
    )

    # 3. SPEAKER DISCOVERY WORKFLOW
    run_discovery_test_case(
        case_num=3,
        category="Speakers",
        user_prompt="Looking for keynote speakers in Europe with experience in Large Language Models, PyTorch optimization, or CUDA programming for a developer conference.",
        top_k=3
    )


if __name__ == "__main__":
    test_real_world_workflows()