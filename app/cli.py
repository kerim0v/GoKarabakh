import click

from app.models.user import User
from app.services import facade


def register_commands(app):
    @app.cli.command("seed")
    def seed_command():
        """Add the district hotels, restaurants, attractions and tours."""
        from seed_places import seed
        click.echo(f"Seeded {seed()} places.")

    @app.cli.command("demo-data")
    @click.option("--password", prompt="Password for the demo accounts (8+ characters)", hide_input=True,
                  confirmation_prompt=True, help="Shared by all demo accounts.")
    def demo_data_command(password):
        """Add demo accounts, bookings, a review and a trace for showing the site."""
        from app.services.passwords import problem
        from demo_data import ACCOUNTS, create_demo_data
        if len(password) < 8 or problem(password):
            raise click.ClickException("Choose a longer, less common password.")
        if not create_demo_data(password):
            raise click.ClickException("Demo data already exists.")
        click.echo("Demo accounts: " + ", ".join(email for email, *_ in ACCOUNTS))

    @app.cli.command("create-admin")
    @click.argument("email")
    @click.option("--name", default="Admin", help="Name for a new account.")
    def create_admin_command(email, name):
        """Make EMAIL an admin, creating the account if it doesn't exist."""
        email = email.strip().lower()
        user = facade.get_user_by_email(email)
        if user:
            facade.update_user(user.id, {"role": "admin"})
            click.echo(f"{email} is now an admin.")
            return
        password = click.prompt("Password (8+ characters)", hide_input=True, confirmation_prompt=True)
        if len(password) < 8:
            raise click.ClickException("Password must be at least 8 characters.")
        user = User(kx_count=0, name=name, email=email, role="admin")
        user.hash_pwd(password)
        facade.create_user(user)
        click.echo(f"Created admin {email}.")
