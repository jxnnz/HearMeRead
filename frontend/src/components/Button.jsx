function Button({ label, variant, onClick, icon = null }) {

    return (
        <button className={`btn btn-${variant} mt-2`} onClick={onClick}>
            {icon && icon} {label}
        </button>
    );
}

export default Button;