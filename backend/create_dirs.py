import os

dirs = [
    "app/core",
    "app/api/v1",
    "app/models",
    "app/schemas",
    "app/repositories",
    "app/services",
    "app/ai",
    "app/resume",
    "app/scoring",
    "app/roadmap",
    "app/interview",
    "app/chatbot",
    "app/jobs",
]

for d in dirs:
    os.makedirs(os.path.join(r"C:\Users\ayush\OneDrive\Attachments\Documents\Desktop\CareerPro AI\backend", d), exist_ok=True)
    init_file = os.path.join(r"C:\Users\ayush\OneDrive\Attachments\Documents\Desktop\CareerPro AI\backend", d, "__init__.py")
    if not os.path.exists(init_file):
        with open(init_file, "w") as f:
            f.write("")

print("Directories created.")
