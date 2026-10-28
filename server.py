from app import create_app
import config


app = create_app()

if __name__ == "__main__":
    app.run(debug=config.is_debugging())
