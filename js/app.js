class Producto {
    constructor(id, nombre, precio, imagen, stock, condicion, envioGratis) {
        this.id = id;
        this.nombre = nombre;
        this.precio = precio;
        this.imagen = imagen;
        this.stock = stock;
        this.condicion = condicion;
        this.envioGratis = envioGratis;
    }
}

class Carrito {
    constructor() {
        this.productos = JSON.parse(localStorage.getItem('carrito') || '[]');
    }

    agregarProducto(producto, cantidad) {
        const item = this.productos.find(p => p.producto.id === producto.id);
        item ? item.cantidad += cantidad : this.productos.push({ producto, cantidad });
        this.guardarCarrito();
    }

    eliminarProducto(idProducto) {
        const item = this.productos.find(p => p.producto.id === idProducto);
        if (item) productos.find(p => p.id === idProducto).stock += item.cantidad;
        this.productos = this.productos.filter(p => p.producto.id !== idProducto);
        this.guardarCarrito();
    }

    verCarrito() {
        return this.productos.map(({ producto, cantidad }) => ({
            ...producto,
            cantidad,
            subtotal: cantidad * producto.precio
        }));
    }

    calcularTotal() {
        return this.productos.reduce((total, p) => total + p.cantidad * p.producto.precio, 0);
    }

    guardarCarrito() {
        localStorage.setItem('carrito', JSON.stringify(this.productos));
    }

    actualizarCantidad(idProducto, nuevaCantidad) {
        const item = this.productos.find(p => p.producto.id === idProducto);
        if (item) {
            const diferencia = nuevaCantidad - item.cantidad;
            const producto = productos.find(p => p.id === idProducto);
            if (producto.stock >= diferencia || diferencia < 0) {
                item.cantidad = nuevaCantidad;
                producto.stock -= diferencia;
                if (item.cantidad <= 0) {
                    this.eliminarProducto(idProducto);
                }
                this.guardarCarrito();
                return true;
            }
        }
        return false;
    }

    vaciarCarrito() {
        this.productos.forEach(item => {
            const producto = productos.find(p => p.id === item.producto.id);
            if (producto) {
                producto.stock += item.cantidad;
            }
        });
        this.productos = [];
        this.guardarCarrito();
    }
}

const carrito = new Carrito();
let productos = [];

async function obtenerProductosDeAPI() {
    try {
        const response = await fetch('https://api.mercadolibre.com/sites/MLA/search?q=tecnologia&limit=20');
        const data = await response.json();
        return data.results.map(item => {
            let imagen = 'img/producto_default.jpg';
            if (item.thumbnail) {
                imagen = item.thumbnail;
            }
            if (item.pictures && item.pictures.length > 0 && item.pictures[0].url) {
                imagen = item.pictures[0].url;
            }
            return new Producto(
                item.id || 'sin_id',
                item.title || 'Producto sin nombre',
                item.price || 0,
                imagen,
                item.available_quantity || 0,
                item.condition || 'No especificado',
                item.shipping?.free_shipping || false
            );
        });
    } catch (error) {
        console.error('Error al obtener productos:', error);
        return [];
    }
}

async function inicializarProductos() {
    productos = await obtenerProductosDeAPI();
    mostrarProductosDisponibles();
    console.log("Número de productos:", productos.length);
}

function mostrarProductosDisponibles() {
    const productosLista = document.getElementById('productos-lista');
    if (!productosLista) {
        console.error("El elemento 'productos-lista' no se encontró en el DOM");
        return;
    }
    productosLista.innerHTML = productos.map(producto => `
        <div class="producto">
            <img src="${producto.imagen}" alt="${producto.nombre}" class="producto-imagen">
            <h3>${producto.nombre}</h3>
            <p>Precio: $${producto.precio.toFixed(2)}</p>
            <p>Stock: ${producto.stock}</p>
            <p>Condición: ${producto.condicion}</p>
            <p>${producto.envioGratis ? 'Envío gratis' : 'Envío a cargo del comprador'}</p>
            <button onclick="agregarAlCarrito('${producto.id}')">Agregar al carrito</button>
        </div>
    `).join('');
}

function agregarAlCarrito(idProducto) {
    const producto = productos.find(p => p.id === idProducto);
    if (producto?.stock > 0) {
        carrito.agregarProducto(producto, 1);
        producto.stock--;
        actualizarCarrito();
        mostrarProductosDisponibles();
    } else {
        Swal.fire('Error', 'No hay suficiente stock disponible.', 'error');
    }
}

function mostrarCarritoFlotante() {
    const carritoHTML = carrito.verCarrito().map(item => `
        <div class="carrito-item">
            <img src="${item.imagen}" alt="${item.nombre}" class="carrito-imagen">
            <div class="carrito-item-info">
                <h3 title="${item.nombre}">${item.nombre}</h3>
                <div class="cantidad-control">
                    <button onclick="actualizarCantidadEnCarrito('${item.id}', ${item.cantidad - 1})">-</button>
                    <span>${item.cantidad}</span>
                    <button onclick="actualizarCantidadEnCarrito('${item.id}', ${item.cantidad + 1})">+</button>
                </div>
                <p>Subtotal: $${item.subtotal.toFixed(2)}</p>
            </div>
            <button onclick="eliminarDelCarrito('${item.id}')" class="eliminar-btn">X</button>
        </div>
    `).join('');

    Swal.fire({
        title: 'Carrito de Compras',
        html: `
            <div id="carrito-lista">${carritoHTML}</div>
            <div id="carrito-total">Total: $${carrito.calcularTotal().toFixed(2)}</div>
            <button id="vaciar-carrito" class="vaciar-carrito-btn">Vaciar Carrito</button>
            <button id="realizar-compra" class="realizar-compra-btn">Realizar Compra</button>
        `,
        showCloseButton: true,
        showConfirmButton: false,
        customClass: {
            container: 'carrito-flotante-container',
            popup: 'carrito-flotante-popup',
            header: 'carrito-flotante-header',
            closeButton: 'carrito-flotante-close',
        },
        didOpen: () => {
            document.getElementById('vaciar-carrito').addEventListener('click', vaciarCarrito);
            document.getElementById('realizar-compra').addEventListener('click', realizarCompra);
        }
    });
}

function actualizarCantidadEnCarrito(idProducto, nuevaCantidad) {
    if (carrito.actualizarCantidad(idProducto, nuevaCantidad)) {
        actualizarCarrito();
        mostrarProductosDisponibles();
        mostrarCarritoFlotante();
    } else {
        Swal.fire('Error', 'No hay suficiente stock disponible', 'error');
    }
}

function vaciarCarrito() {
    Swal.fire({
        title: '¿Estás seguro?',
        text: "Se eliminarán todos los productos del carrito",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, vaciar carrito',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            carrito.vaciarCarrito();
            actualizarCarrito();
            mostrarProductosDisponibles();
            mostrarCarritoFlotante();
            Swal.fire(
                'Carrito vaciado',
                'Se han eliminado todos los productos del carrito',
                'success'
            );
        }
    });
}

function actualizarCarrito() {
    const cantidadTotal = carrito.productos.reduce((total, item) => total + item.cantidad, 0);
    document.getElementById('abrir-carrito').textContent = `Ver Carrito (${cantidadTotal})`;
}

function eliminarDelCarrito(idProducto) {
    carrito.eliminarProducto(idProducto);
    actualizarCarrito();
    mostrarProductosDisponibles();
    mostrarCarritoFlotante();
}

function realizarCompra() {
    if (carrito.productos.length === 0) {
        Swal.fire('Error', 'El carrito está vacío', 'error');
    } else {
        Swal.fire({
            title: 'Compra realizada',
            text: `Has comprado ${carrito.productos.length} productos por un total de $${carrito.calcularTotal().toFixed(2)}`,
            icon: 'success',
            confirmButtonText: 'OK'
        }).then((result) => {
            if (result.isConfirmed) {
                carrito.vaciarCarrito();
                actualizarCarrito();
                mostrarProductosDisponibles();
            }
        });
    }
}

document.getElementById('abrir-carrito').addEventListener('click', mostrarCarritoFlotante);

// Inicializar la página
inicializarProductos();
actualizarCarrito();