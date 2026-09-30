import asyncio
from sqlalchemy import select
from app.core.db import AsyncSessionLocal
from app.models.domain import TargetRole, Skill, RoleSkill

seed_data = [
    {
        "role": "Frontend Developer",
        "description": "Builds the user-facing portion of websites and web applications.",
        "category": "Software Engineering",
        "skills": [
            {"name": "HTML", "importance": 5},
            {"name": "CSS", "importance": 5},
            {"name": "JavaScript", "importance": 5},
            {"name": "React", "importance": 4},
            {"name": "TypeScript", "importance": 4},
            {"name": "Git", "importance": 4},
            {"name": "Responsive Design", "importance": 5},
            {"name": "Accessibility", "importance": 3},
            {"name": "Performance", "importance": 3},
            {"name": "Testing", "importance": 3},
        ]
    },
    {
        "role": "Backend Developer",
        "description": "Builds server-side logic, databases, and APIs.",
        "category": "Software Engineering",
        "skills": [
            {"name": "Python", "importance": 4},
            {"name": "Java", "importance": 4},
            {"name": "Node.js", "importance": 4},
            {"name": "PostgreSQL", "importance": 5},
            {"name": "REST APIs", "importance": 5},
            {"name": "Docker", "importance": 4},
            {"name": "Git", "importance": 4},
            {"name": "Testing", "importance": 3},
        ]
    },
    {
        "role": "Full Stack Developer",
        "description": "Builds both frontend and backend portions of web applications.",
        "category": "Software Engineering",
        "skills": [
            {"name": "JavaScript", "importance": 5},
            {"name": "React", "importance": 4},
            {"name": "Node.js", "importance": 4},
            {"name": "PostgreSQL", "importance": 4},
            {"name": "REST APIs", "importance": 4},
            {"name": "Git", "importance": 4},
        ]
    },
    {
        "role": "Software Engineer",
        "description": "Designs, develops, and maintains software systems.",
        "category": "Software Engineering",
        "skills": [
            {"name": "Data Structures", "importance": 5},
            {"name": "Algorithms", "importance": 5},
            {"name": "System Design", "importance": 4},
            {"name": "Git", "importance": 4},
            {"name": "Testing", "importance": 4},
        ]
    },
    {
        "role": "Data Analyst",
        "description": "Analyzes data to extract actionable insights.",
        "category": "Data",
        "skills": [
            {"name": "SQL", "importance": 5},
            {"name": "Excel", "importance": 4},
            {"name": "Python", "importance": 4},
            {"name": "Tableau", "importance": 3},
            {"name": "Statistics", "importance": 4},
        ]
    },
    {
        "role": "Data Scientist",
        "description": "Uses statistical and machine learning techniques to solve complex problems.",
        "category": "Data",
        "skills": [
            {"name": "Python", "importance": 5},
            {"name": "Machine Learning", "importance": 5},
            {"name": "Statistics", "importance": 5},
            {"name": "SQL", "importance": 4},
            {"name": "Data Visualization", "importance": 4},
        ]
    },
    {
        "role": "AI/ML Engineer",
        "description": "Builds and deploys machine learning models into production.",
        "category": "Data",
        "skills": [
            {"name": "Python", "importance": 5},
            {"name": "Machine Learning", "importance": 5},
            {"name": "Deep Learning", "importance": 4},
            {"name": "TensorFlow/PyTorch", "importance": 4},
            {"name": "Docker", "importance": 3},
        ]
    },
    {
        "role": "DevOps Engineer",
        "description": "Bridges the gap between software development and IT operations.",
        "category": "Infrastructure",
        "skills": [
            {"name": "Linux", "importance": 5},
            {"name": "Docker", "importance": 5},
            {"name": "Kubernetes", "importance": 4},
            {"name": "CI/CD", "importance": 5},
            {"name": "AWS/GCP/Azure", "importance": 4},
            {"name": "Terraform", "importance": 4},
        ]
    }
]

async def seed():
    async with AsyncSessionLocal() as db:
        for item in seed_data:
            # Check if role exists (global role where profile_id is None)
            stmt = select(TargetRole).where(TargetRole.title == item["role"], TargetRole.profile_id.is_(None))
            result = await db.execute(stmt)
            role = result.scalar_one_or_none()
            
            if not role:
                role = TargetRole(
                    title=item["role"],
                    description=item["description"],
                    category=item["category"],
                    profile_id=None
                )
                db.add(role)
                await db.flush()
                
            for skill_data in item["skills"]:
                # Check if skill exists
                stmt = select(Skill).where(Skill.name == skill_data["name"])
                result = await db.execute(stmt)
                skill = result.scalar_one_or_none()
                
                if not skill:
                    skill = Skill(name=skill_data["name"], category=item["category"])
                    db.add(skill)
                    await db.flush()
                
                # Link skill to role
                stmt = select(RoleSkill).where(RoleSkill.target_role_id == role.id, RoleSkill.skill_id == skill.id)
                result = await db.execute(stmt)
                role_skill = result.scalar_one_or_none()
                
                if not role_skill:
                    role_skill = RoleSkill(
                        target_role_id=role.id,
                        skill_id=skill.id,
                        importance_level=skill_data["importance"]
                    )
                    db.add(role_skill)
        
        await db.commit()
        print("Taxonomy seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed())
