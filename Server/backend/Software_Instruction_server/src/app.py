from retrieval.search_engine import get_available_softwares, search
from response_generator.generate_response import generate_detailed_response
import time


def select_software():
    software_list = get_available_softwares()
    if not software_list:
        print("No software list found in dataset. Running in global mode.")
        return None

    print("\nSelect software context:")
    print("0. All software")
    for i, software in enumerate(software_list, start=1):
        print(f"{i}. {software}")

    while True:
        choice = input("Enter number: ").strip()
        if choice.isdigit():
            idx = int(choice)
            if idx == 0:
                return None
            if 1 <= idx <= len(software_list):
                return software_list[idx - 1]
        print("Invalid selection. Please enter a valid number.")


def main():
    print("=" * 60)
    print("SMART SOFTWARE SUPPORT AI (Offline Generative Mode)")
    print("=" * 60)

    selected_software = select_software()

    while True:
        scope = selected_software if selected_software else "All software"
        query = input(
            f"\n[{scope}] Ask your software question ('/software' to change, 'exit' to quit): "
        )

        if query.lower().strip() == "exit":
            print("\nExiting AI system. Goodbye.\n")
            break

        if query.lower().strip() == "/software":
            selected_software = select_software()
            continue

        if len(query.strip()) < 3:
            print("Please enter a valid question.")
            continue

        print("\nSearching knowledge base...")
        predicted_type, results = search(query, selected_software=selected_software)

        if results is None or results.empty:
            print("\nNo relevant documentation found.")
            continue

        print("Generating AI response... (this may take a few seconds)")
        start_time = time.time()

        response = generate_detailed_response(query, predicted_type, results)

        end_time = time.time()

        print("\n" + response)
        print(f"Response generated in {round(end_time - start_time, 2)} seconds.")


if __name__ == "__main__":
    main()
