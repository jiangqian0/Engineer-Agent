from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-this-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///marketplace.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'static/uploads'

# Create upload folder if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

db = SQLAlchemy(app)

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    phone = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    items = db.relationship('Item', backref='seller', lazy=True)
    favorites = db.relationship('Favorite', backref='user', lazy=True)

class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    price = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    condition = db.Column(db.String(20), nullable=False)  # new, like_new, good, fair
    image_url = db.Column(db.String(200))
    status = db.Column(db.String(20), default='available')  # available, sold, reserved
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    seller_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    favorites = db.relationship('Favorite', backref='item', lazy=True)

class Favorite(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('item.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Create database tables
with app.app_context():
    db.create_all()

# Routes
@app.route('/')
def index():
    items = Item.query.filter_by(status='available').order_by(Item.created_at.desc()).limit(12).all()
    return render_template('index.html', items=items)

@app.route('/items')
def items():
    category = request.args.get('category')
    search = request.args.get('search')
    
    query = Item.query.filter_by(status='available')
    
    if category:
        query = query.filter_by(category=category)
    
    if search:
        query = query.filter(Item.title.contains(search) | Item.description.contains(search))
    
    items = query.order_by(Item.created_at.desc()).all()
    return render_template('items.html', items=items, category=category, search=search)

@app.route('/item/<int:item_id>')
def item_detail(item_id):
    item = Item.query.get_or_404(item_id)
    return render_template('item_detail.html', item=item)

@app.route('/sell', methods=['GET', 'POST'])
def sell():
    if request.method == 'POST':
        title = request.form.get('title')
        description = request.form.get('description')
        price = float(request.form.get('price'))
        category = request.form.get('category')
        condition = request.form.get('condition')
        seller_id = 1  # TODO: Get from session
        
        # Handle image upload
        image_file = request.files.get('image')
        image_url = None
        if image_file and image_file.filename:
            filename = f"{datetime.now().timestamp()}_{image_file.filename}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            image_file.save(filepath)
            image_url = f'/static/uploads/{filename}'
        
        new_item = Item(
            title=title,
            description=description,
            price=price,
            category=category,
            condition=condition,
            image_url=image_url,
            seller_id=seller_id
        )
        
        db.session.add(new_item)
        db.session.commit()
        
        return redirect(url_for('items'))
    
    return render_template('sell.html')

@app.route('/profile')
def profile():
    user_id = 1  # TODO: Get from session
    user = User.query.get(user_id)
    items = Item.query.filter_by(seller_id=user_id).all()
    return render_template('profile.html', user=user, items=items)

@app.route('/api/items/<int:item_id>/favorite', methods=['POST'])
def toggle_favorite(item_id):
    user_id = 1  # TODO: Get from session
    favorite = Favorite.query.filter_by(user_id=user_id, item_id=item_id).first()
    
    if favorite:
        db.session.delete(favorite)
        db.session.commit()
        return jsonify({'success': True, 'favorited': False})
    else:
        new_favorite = Favorite(user_id=user_id, item_id=item_id)
        db.session.add(new_favorite)
        db.session.commit()
        return jsonify({'success': True, 'favorited': True})

@app.route('/api/items/<int:item_id>/contact', methods=['POST'])
def contact_seller(item_id):
    item = Item.query.get_or_404(item_id)
    seller = item.seller
    
    # TODO: Send email or notification to seller
    return jsonify({
        'success': True,
        'seller_phone': seller.phone,
        'seller_email': seller.email
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
