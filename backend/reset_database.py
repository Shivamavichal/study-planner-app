"""
Reset database script - Use this if you encounter data issues
"""
import os
import sqlite3
from simple_setup import create_tables, seed_data

def reset_database():
    """Reset the database by deleting and recreating it"""
    db_path = "student_planner.db"
    
    print("🔄 Resetting database...")
    
    # Delete existing database
    if os.path.exists(db_path):
        os.remove(db_path)
        print("✅ Deleted old database")
    
    # Create new database with tables and seed data
    create_tables()
    seed_data()
    
    print("🎉 Database reset complete!")
    print("Demo login: student@example.com / password123")

if __name__ == "__main__":
    print("⚠️  WARNING: This will delete all existing data!")
    confirm = input("Are you sure you want to reset the database? (yes/no): ").lower().strip()
    
    if confirm == "yes":
        reset_database()
    else:
        print("❌ Database reset cancelled.")