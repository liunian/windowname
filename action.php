<?php
//sleep(5);

$data = array('post' => $_POST, 'files' => $_FILES);

$ret = addslashes(json_encode($data));

if(isset($_POST['windowname']) && $_POST['windowname']) {
?>
<script type="text/javascript">
// alert(window.name);
window.name = "<?php echo $ret; ?>";
// alert(window.name);
</script>

<?php
} else {
    echo json_encode($ret);
}
?>
