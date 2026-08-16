from flask_bcrypt import Bcrypt


crypter: Bcrypt = None


def share_init(app):
    global crypter
    crypter = Bcrypt(app)
